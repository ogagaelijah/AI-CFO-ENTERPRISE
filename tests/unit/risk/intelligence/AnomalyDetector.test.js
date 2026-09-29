'use strict';

/**
 * AnomalyDetector – Jest production test suite (v2.1.0)
 */

const AnomalyDetector = require('../../../../src/application/services/risk/intelligence/AnomalyDetector');
const RiskRules = require('../../../../src/application/services/risk/rules/RiskRules');
const { RISK_STATUS } = require('../../../../src/application/services/risk/contracts');

function makeSeries(n, base = 100, noise = 5) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(base + (Math.random() - 0.5) * noise * 2);
  }
  return out;
}

function injectSpike(series, index, magnitude) {
  const copy = series.slice();
  copy[index] = magnitude;
  return copy;
}

function createDetector(overrides = {}) {
  return new AnomalyDetector({
    logger: { debug() {}, warn() {}, error() {}, info() {} },
    ...overrides,
  });
}

describe('RiskRules.anomaly – complete SSOT keys', () => {
  test('exposes every key consumed by AnomalyDetector', () => {
    const rules = new RiskRules();
    const cfg = rules.getThresholds('anomaly');

    const required = [
      'defaultMethod',
      'zScoreThreshold',
      'robustZScoreThreshold',
      'madConsistencyConstant',
      'minDeviationPercent',
      'movingAverageWindowRatio',
      'movingAverageMinWindow',
      'movingAverageMaxWindow',
      'iqrMildMultiplier',
      'iqrExtremeMultiplier',
      'minDataPoints',
      'maxInputLength',
      'cacheMaxSize',
      'cacheTtlMs',
      'severityCriticalRatio',
      'severityHighRatio',
      'severityMediumRatio',
      'severityCriticalPercent',
      'severityHighPercent',
      'severityMediumPercent',
      'scoreBaseCritical',
      'scoreBaseHigh',
      'scoreBaseMedium',
      'scoreBaseLow',
      'scorePerAnomaly',
      'scorePerAnomalyCap',
    ];

    for (const key of required) {
      expect(cfg[key]).toBeDefined();
    }
  });

  test('defaultMethod is robust_zscore', () => {
    const rules = new RiskRules();
    expect(rules.getThresholds('anomaly').defaultMethod).toBe('robust_zscore');
  });
});

describe('AnomalyDetector – construction & config', () => {
  test('uses SSOT defaults including defaultMethod = robust_zscore', () => {
    const d = createDetector();
    expect(d.defaultMethod).toBe('robust_zscore');
    expect(d.threshold).toBe(2.5);
    expect(d.robustThreshold).toBe(3.5);
    expect(d.minDataPoints).toBe(10);
    expect(d.minDeviationPercent).toBe(30);
    expect(d.maxInputLength).toBe(50000);
    expect(d.madConsistencyConstant).toBe(0.6745);
    expect(d.iqrMildMultiplier).toBe(1.5);
    expect(d.iqrExtremeMultiplier).toBe(3.0);
  });

  test('accepts constructor overrides', () => {
    const d = createDetector({
      defaultMethod: 'zscore',
      threshold: 3.0,
      robustThreshold: 4.0,
      minDataPoints: 5,
      minDeviationPercent: 20,
      cacheMaxSize: 10,
    });
    expect(d.defaultMethod).toBe('zscore');
    expect(d.threshold).toBe(3.0);
    expect(d.robustThreshold).toBe(4.0);
    expect(d.minDataPoints).toBe(5);
    expect(d.minDeviationPercent).toBe(20);
    expect(d._maxCacheSize).toBe(10);
  });

  test('exposes DETECTOR_VERSION and SUPPORTED_METHODS', () => {
    expect(AnomalyDetector.DETECTOR_VERSION).toBe('2.1.0');
    expect(AnomalyDetector.SUPPORTED_METHODS).toContain('robust_zscore');
    expect(AnomalyDetector.SUPPORTED_METHODS).toContain('zscore');
    expect(AnomalyDetector.SUPPORTED_METHODS).toContain('iqr');
  });
});

describe('AnomalyDetector – default method is robust_zscore', () => {
  test('detect() without method uses robust_zscore', () => {
    const values = makeSeries(20, 100, 3);
    values[15] = 500;
    const d = createDetector();
    const result = d.detect({ values, metric: 'gmv' });
    expect(result.method).toBe('robust_zscore');
  });

  test('quickCheck uses defaultMethod (robust_zscore)', () => {
    const values = makeSeries(15, 40, 2);
    values[10] = 300;
    const d = createDetector();
    const result = d.quickCheck(values, 'q', 'Quick');
    expect(result.method).toBe('robust_zscore');
  });

  test('isAnomalous uses defaultMethod (robust_zscore)', () => {
    const historical = makeSeries(20, 100, 2);
    const d = createDetector();
    const { isAnomalous } = d.isAnomalous(800, historical);
    expect(typeof isAnomalous).toBe('boolean');
  });
});

describe('AnomalyDetector – insufficient data', () => {
  test('returns unavailable when below minDataPoints', () => {
    const d = createDetector({ minDataPoints: 10 });
    const result = d.detect({
      values: [1, 2, 3],
      metric: 'revenue',
      metricDisplayName: 'Revenue',
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_DATA');
    expect(result.anomalies).toHaveLength(0);
    expect(result.hasAnomalies).toBe(false);
  });
});

describe('AnomalyDetector – robust_zscore method (default)', () => {
  test('detects a clear spike with MAD', () => {
    const base = makeSeries(30, 100, 3);
    const values = injectSpike(base, 25, 400);
    const d = createDetector();
    const result = d.detect({
      values,
      metric: 'orders',
      metricDisplayName: 'Orders',
      method: 'robust_zscore',
    });

    expect(result.available).toBe(true);
    expect(result.method).toBe('robust_zscore');
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies.length).toBeGreaterThan(0);

    const top = result.anomalies[0];
    expect(top.isSpike).toBe(true);
    expect(top.direction).toBe('SPIKE');
    expect(top.method).toBe('robust_zscore');
    expect(top.message).toContain('Orders');
  });

  test('flags outliers that classic zscore may under-weight when contaminated', () => {
    const values = [
      10, 11, 10, 12, 11, 10, 11, 12, 10, 11,
      50, 10, 11, 10, 200,
    ];
    const d = createDetector({ minDataPoints: 10 });
    const robust = d.detect({
      values,
      metric: 'x',
      method: 'robust_zscore',
    });

    expect(robust.available).toBe(true);
    expect(robust.method).toBe('robust_zscore');
    expect(robust.hasAnomalies).toBe(true);
    const extreme = robust.anomalies.find((a) => a.value === 200);
    expect(extreme).toBeDefined();
    expect(extreme.isSpike).toBe(true);
  });

  test('returns no anomalies for flat series', () => {
    const values = Array(20).fill(42);
    const d = createDetector();
    const result = d.detect({ values, metric: 'flat' });
    expect(result.available).toBe(true);
    expect(result.hasAnomalies).toBe(false);
    expect(result.risk.status).toBe(RISK_STATUS.MONITORING);
  });
});

describe('AnomalyDetector – zscore method', () => {
  test('detects a clear spike', () => {
    const base = makeSeries(30, 100, 3);
    const values = injectSpike(base, 25, 250);
    const d = createDetector({ threshold: 2.0 });
    const result = d.detect({
      values,
      metric: 'orders',
      metricDisplayName: 'Orders',
      method: 'zscore',
    });

    expect(result.available).toBe(true);
    expect(result.hasAnomalies).toBe(true);
    expect(result.method).toBe('zscore');
    const top = result.anomalies[0];
    expect(top.isSpike).toBe(true);
    expect(Math.abs(top.zScore)).toBeGreaterThan(2);
  });

  test('detects a clear drop', () => {
    const base = makeSeries(30, 100, 3);
    const values = injectSpike(base, 20, 5);
    const d = createDetector({ threshold: 2.0 });
    const result = d.detect({
      values,
      metric: 'conversion',
      method: 'zscore',
    });
    expect(result.hasAnomalies).toBe(true);
    const drop = result.anomalies.find((a) => a.isDrop);
    expect(drop).toBeDefined();
    expect(drop.direction).toBe('DROP');
  });

  test('attaches dates when provided', () => {
    const values = makeSeries(15, 50, 2);
    values[10] = 500;
    const dates = values.map(
      (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`
    );
    const d = createDetector({ threshold: 2.0, minDataPoints: 10 });
    const result = d.detect({
      values,
      dates,
      metric: 'm',
      method: 'zscore',
    });
    expect(result.hasAnomalies).toBe(true);
    const a = result.anomalies.find((x) => x.index === 10);
    expect(a).toBeDefined();
    expect(a.date).toBe('2024-01-11');
  });
});

describe('AnomalyDetector – percentage method', () => {
  test('detects large percentage deviations from trimmed mean', () => {
    const values = makeSeries(25, 100, 4);
    values[20] = 300;
    const d = createDetector({ minDeviationPercent: 40, minDataPoints: 10 });
    const result = d.detect({
      values,
      metric: 'gmv',
      method: 'percentage',
    });
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies[0].deviationPercent).toBeGreaterThan(40);
  });
});

describe('AnomalyDetector – moving_average method', () => {
  test('detects deviation from local window', () => {
    const values = [];
    for (let i = 0; i < 20; i++) values.push(100);
    values[15] = 250;
    const d = createDetector({ minDeviationPercent: 30, minDataPoints: 10 });
    const result = d.detect({
      values,
      metric: 'sessions',
      method: 'moving_average',
    });
    expect(result.hasAnomalies).toBe(true);
    const a = result.anomalies.find((x) => x.index === 15);
    expect(a).toBeDefined();
    expect(a.windowSize).toBeDefined();
  });
});

describe('AnomalyDetector – iqr method', () => {
  test('flags points outside IQR fences', () => {
    const values = makeSeries(40, 50, 5);
    values[5] = 500;
    values[30] = -100;
    const d = createDetector({ minDataPoints: 10 });
    const result = d.detect({
      values,
      metric: 'latency',
      method: 'iqr',
    });
    expect(result.hasAnomalies).toBe(true);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    const extreme = result.anomalies.find(
      (a) => a.value === 500 || a.value === -100
    );
    expect(extreme).toBeDefined();
  });
});

describe('AnomalyDetector – severity, score, trend, impact', () => {
  test('derives elevated severity and score for extreme outliers', () => {
    const values = [];
    for (let i = 0; i < 30; i++) values.push(100 + (i % 2) * 0.01);
    values[25] = 10_000;
    const d = createDetector({ threshold: 2.0, minDataPoints: 10 });
    const result = d.detect({ values, metric: 'x', method: 'zscore' });
    expect(result.hasAnomalies).toBe(true);
    expect(['CRITICAL', 'HIGH']).toContain(result.risk.severity);
    expect(result.risk.score).toBeGreaterThanOrEqual(60);
    expect(result.risk.status).toBe(RISK_STATUS.ACTIVE);
  });

  test('trend is WORSENING when spikes dominate', () => {
    const values = makeSeries(20, 50, 1);
    values[10] = 300;
    values[15] = 400;
    const d = createDetector();
    const result = d.detect({ values, metric: 'x', method: 'robust_zscore' });
    expect(result.risk.trend).toBe('WORSENING');
  });

  test('impact.financial is computed from max deviation', () => {
    const values = makeSeries(15, 100, 2);
    values[12] = 400;
    const d = createDetector();
    const result = d.detect({ values, metric: 'x' });
    expect(result.risk.impact.financial).toBeGreaterThan(0);
  });
});

describe('AnomalyDetector – cache', () => {
  test('returns cached result on identical fingerprint', () => {
    const values = makeSeries(15, 80, 3);
    const d = createDetector({ cacheTtlMs: 60_000 });
    const r1 = d.detect({ values, metric: 'c1' });
    const r2 = d.detect({ values, metric: 'c1' });
    expect(r1).toBe(r2);
    const metrics = d.getMetrics();
    expect(metrics.cacheHits).toBeGreaterThanOrEqual(1);
  });

  test('skipCache bypasses cache', () => {
    const values = makeSeries(12, 50, 2);
    const d = createDetector();
    d.detect({ values, metric: 'c2' });
    d.detect({ values, metric: 'c2', skipCache: true });
    expect(d.getMetrics().detections).toBeGreaterThanOrEqual(2);
  });

  test('clearCache empties the store', () => {
    const d = createDetector();
    d.detect({ values: makeSeries(12), metric: 'c3' });
    expect(d.getMetrics().cacheSize).toBeGreaterThan(0);
    d.clearCache();
    expect(d.getMetrics().cacheSize).toBe(0);
  });
});

describe('AnomalyDetector – isAnomalous & quickCheck', () => {
  test('isAnomalous correctly identifies a new spike', () => {
    const historical = makeSeries(20, 100, 2);
    const d = createDetector();
    const { isAnomalous, anomaly } = d.isAnomalous(900, historical);
    expect(isAnomalous).toBe(true);
    expect(anomaly).toBeDefined();
    expect(anomaly.isSpike).toBe(true);
  });

  test('isAnomalous returns false for normal continuation', () => {
    const historical = makeSeries(20, 100, 2);
    const d = createDetector();
    const { isAnomalous } = d.isAnomalous(101, historical);
    expect(isAnomalous).toBe(false);
  });

  test('quickCheck returns robust_zscore result', () => {
    const values = makeSeries(15, 40, 2);
    values[10] = 400;
    const d = createDetector();
    const result = d.quickCheck(values, 'q', 'Quick');
    expect(result.method).toBe('robust_zscore');
    expect(result.hasAnomalies).toBe(true);
  });
});

describe('AnomalyDetector – input hygiene & resilience', () => {
  test('coerces non-numeric values to 0', () => {
    const values = [10, 11, null, undefined, '12', NaN, 13, 14, 15, 16, 17];
    const d = createDetector({ minDataPoints: 8 });
    const result = d.detect({ values, metric: 'dirty' });
    expect(result.available).toBe(true);
  });

  test('handles null values gracefully via fallback', () => {
    const d = createDetector();
    const result = d.detect({ values: null, metric: 'nulls' });
    expect(result.meta.error).toBe(true);
    expect(result.summary).toContain('failed');
  });

  test('falls back to defaultMethod on unsupported method name', () => {
    const values = makeSeries(15, 20, 1);
    const d = createDetector();
    const result = d.detect({
      values,
      metric: 'm',
      method: 'totally_unknown',
    });
    expect(result.method).toBe('robust_zscore');
  });

  test('outputs are deeply frozen (immutable)', () => {
    const values = makeSeries(12, 30, 2);
    values[8] = 200;
    const d = createDetector();
    const result = d.detect({ values, metric: 'imm' });
    expect(() => {
      result.anomalies.push({});
    }).toThrow();
  });

  test('truncates extremely long inputs', () => {
    const d = createDetector({ maxInputLength: 100, minDataPoints: 10 });
    const values = makeSeries(500, 10, 1);
    const result = d.detect({ values, metric: 'long' });
    expect(result.available).toBe(true);
    expect(result.dataPoints).toBe(100);
  });
});

describe('AnomalyDetector – RiskContract shape', () => {
  test('produces a valid risk object when anomalies exist', () => {
    const values = makeSeries(15, 50, 2);
    values[12] = 400;
    const d = createDetector();
    const result = d.detect({
      values,
      metric: 'rev',
      metricDisplayName: 'Revenue',
    });
    expect(result.risk).toBeDefined();
    expect(result.risk.type).toBe('ANOMALY');
    expect(result.risk.metric).toBe('rev');
    expect(result.risk.score).toBeGreaterThanOrEqual(0);
    expect(result.risk.score).toBeLessThanOrEqual(100);
    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).toContain(
      result.risk.severity
    );
    expect(result.risk.impact).toBeDefined();
    expect(result.meta.detectorVersion).toBe('2.1.0');
    expect(result.method).toBe('robust_zscore');
  });
});

describe('AnomalyDetector – metrics', () => {
  test('tracks detections, hits and duration', () => {
    const d = createDetector();
    const values = makeSeries(12, 25, 1);
    d.detect({ values, metric: 'm1' });
    d.detect({ values, metric: 'm1' }); // cache hit
    const m = d.getMetrics();
    expect(m.detections).toBeGreaterThanOrEqual(1);
    expect(m.cacheHits).toBeGreaterThanOrEqual(1);
    expect(m.avgDurationMs).toBeGreaterThanOrEqual(0);
  });
});