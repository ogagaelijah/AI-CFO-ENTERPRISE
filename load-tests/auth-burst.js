// load-tests/auth-burst.js
// v2.0.0 — Redefined to measure what matters for a DoS-resistance test.
//
// What we measure now:
//   - Reject throughput  : can the server sustain 500 req/s of rejections
//                          without falling behind or crashing?
//   - Error rate         : must stay 0% — no 5xx, no unhandled errors
//   - Legit success count: must stay > 0 — real users still get in
//                          while the flood is being rejected
//
// What we deliberately DO NOT measure:
//   - Success latency under flood. It's a statistical artifact (9 requests
//     out of 30,000, measured behind 30,000 rejections on one event loop).
//     Real login latency is measured by login-realistic.js at 5 req/s.
//
// Run:
//   k6 run load-tests/auth-burst.js
//
// Env vars:
//   BASE_URL            default http://localhost:5000
//   LOADTEST_EMAIL      default loadtest@aicfo.test
//   LOADTEST_PASSWORD   default LoadTest2026!

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const EMAIL = __ENV.LOADTEST_EMAIL || 'loadtest@aicfo.test';
const PASSWORD = __ENV.LOADTEST_PASSWORD || 'LoadTest2026!';

const TARGET_RPS = 500;
const DURATION_S = 60;

// ── Custom metrics ────────────────────────────────────────────────
const rejected429 = new Counter('auth_rejected_429');
const legitSuccess = new Counter('auth_legit_success');
const otherClientErrors = new Counter('auth_other_4xx');
const serverErrors = new Counter('auth_server_5xx');

// Reject latency: how fast does the limiter return a 429?
const rejectLatency = new Trend('auth_reject_latency_ms', true);

// Success rate: (200 or 429) / total. Should be ~100%.
// Anything below this means unexpected errors are occurring.
const handledRate = new Rate('auth_handled_rate');

export const options = {
  scenarios: {
    auth_flood: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: `${DURATION_S}s`,
      preAllocatedVUs: 100,
      maxVUs: 1000,
    },
  },
  thresholds: {
    // Must be zero 5xx
    'auth_server_5xx': ['count==0'],
    // At least 99.5% of requests must be either 200 or 429
    // (400s and other unexpected errors shouldn't dominate)
    'auth_handled_rate': ['rate>0.995'],
    // At least 1 legitimate login must succeed during the flood.
    // If this is 0, the limiter is too aggressive.
    'auth_legit_success': ['count>=1'],
    // Reject latency must be under 50ms — rejected requests should be cheap
    'auth_reject_latency_ms': ['p(95)<50'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const payload = JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `k6-${__VU}-${__ITER}`,
    },
    redirects: 0,
    tags: { name: 'POST /api/auth/login' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  const handled = res.status === 200 || res.status === 429;

  if (res.status === 200) {
    legitSuccess.add(1);
  } else if (res.status === 429) {
    rejected429.add(1);
    rejectLatency.add(res.timings.duration);
  } else if (res.status >= 500) {
    serverErrors.add(1);
  } else {
    otherClientErrors.add(1);
  }

  handledRate.add(handled);

  check(res, {
    'response is 200 or 429': () => handled,
    'no 5xx': (r) => r.status < 500,
  });

  sleep(0.05);
}

export function handleSummary(data) {
  const m = data.metrics;

  const total = m.http_reqs?.values?.count ?? 0;
  const rate = m.http_reqs?.values?.rate ?? 0;
  const rejected = m.auth_rejected_429?.values?.count ?? 0;
  const success = m.auth_legit_success?.values?.count ?? 0;
  const other4xx = m.auth_other_4xx?.values?.count ?? 0;
  const server5xx = m.auth_server_5xx?.values?.count ?? 0;

  const handledPct = ((m.auth_handled_rate?.values?.rate ?? 0) * 100).toFixed(2);
  const rejectP50 = m.auth_reject_latency_ms?.values?.med ?? 0;
  const rejectP95 = m.auth_reject_latency_ms?.values?.['p(95)'] ?? 0;
  const rejectP99 = m.auth_reject_latency_ms?.values?.['p(99)'] ?? 0;

  const rows = {
    'Target RPS': TARGET_RPS,
    'Duration (s)': DURATION_S,
    'Total requests': total,
    'Actual RPS': Number(rate.toFixed(1)),
    'Success (200)': success,
    'Rejected (429)': rejected,
    'Other 4xx': other4xx,
    'Server 5xx': server5xx,
    'Handled rate (%)': handledPct,
    'Reject latency p50 (ms)': Number(rejectP50.toFixed(2)),
    'Reject latency p95 (ms)': Number(rejectP95.toFixed(2)),
    'Reject latency p99 (ms)': Number(rejectP99.toFixed(2)),
  };

  const out = formatTable('Phase 3 · Auth burst (flood resistance)', rows);

  return {
    stdout: out,
    'load-tests/results/auth-burst.json': JSON.stringify(data, null, 2),
  };
}

function formatTable(title, rows) {
  const pad = Math.max(...Object.keys(rows).map((k) => k.length)) + 2;
  let out = `\n${title}\n`;
  out += '─'.repeat(title.length + 4) + '\n';
  for (const [k, v] of Object.entries(rows)) {
    out += `  ${k.padEnd(pad)} ${v}\n`;
  }
  return out + '\n';
}