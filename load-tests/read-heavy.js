// load-tests/read-heavy.js
// v2.0.0 — Authenticated read-path load test.
//
// v2.0.0 changes (breaking):
//   - Tokens are pre-fetched in setup() for all 50 accounts. Each VU
//     picks its token by VU index. VUs NEVER log in during the run,
//     so no VU churn, no roll resets, no 401 retry path.
//   - Removed per-VU login, per-VU retry, and vuAccountIdx logic.
//     All of that is now handled once in setup.
//   - handleSummary reads Counter.count correctly (previous versions
//     silently returned 0 for counters that existed).
//
// Load model:
//   - env TARGET_RPS     default 20
//   - env DURATION_S     default 120
//
// Request mix:
//   50%  GET /api/sales
//   40%  GET /api/customers?limit=50
//   10%  GET /api/dashboard/summary
//
// Prerequisites:
//   - scripts/create-loadtest-accounts.js has been run (50 accounts)
//   - backend running with LOAD_TEST_MODE=true
//
// Run:
//   k6 run load-tests/read-heavy.js

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PASSWORD = __ENV.LOADTEST_PASSWORD || 'LoadTest2026!';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '20', 10);
const DURATION_S = parseInt(__ENV.DURATION_S || '120', 10);

const ACCOUNTS = Array.from(
  { length: 50 },
  (_, i) => `loadtest${String(i + 1).padStart(2, '0')}@aicfo.test`
);

// ── Custom metrics ────────────────────────────────────────────────
const salesLatency     = new Trend('sales_latency_ms', true);
const customersLatency = new Trend('customers_latency_ms', true);
const dashboardLatency = new Trend('dashboard_latency_ms', true);

const salesHit     = new Counter('sales_hit');
const customersHit = new Counter('customers_hit');
const dashboardHit = new Counter('dashboard_hit');

const salesOk     = new Counter('sales_ok');
const customersOk = new Counter('customers_ok');
const dashboardOk = new Counter('dashboard_ok');

const read429 = new Counter('read_429');
const readServer5xx = new Counter('read_server_5xx');
const successRate = new Rate('read_success_rate');

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: `${DURATION_S}s`,
      preAllocatedVUs: Math.max(10, Math.min(50, TARGET_RPS)),
      maxVUs: Math.max(50, Math.min(200, TARGET_RPS * 4)),
    },
  },
  thresholds: {
    'sales_latency_ms':     ['p(95)<800', 'p(99)<1500'],
    'customers_latency_ms': ['p(95)<800', 'p(99)<1500'],
    'dashboard_latency_ms': ['p(95)<1500', 'p(99)<3000'],
    'read_server_5xx': ['count==0'],
    'read_429': ['count==0'],
    'read_success_rate': ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// ── setup(): log in ALL accounts once, return array of tokens ─────
export function setup() {
  const tokens = [];
  const failures = [];

  for (const email of ACCOUNTS) {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: PASSWORD }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'setup:login' },
      }
    );

    if (res.status !== 200) {
      failures.push(`${email}: status=${res.status}`);
      continue;
    }

    let body;
    try { body = res.json(); } catch {
      failures.push(`${email}: invalid json`);
      continue;
    }
    if (!body?.token) {
      failures.push(`${email}: no token`);
      continue;
    }
    tokens.push(body.token);
  }

  if (tokens.length === 0) {
    throw new Error(`setup: no tokens obtained. failures=${failures.join(' | ')}`);
  }
  if (failures.length > 0) {
    console.warn(`setup: ${failures.length} account(s) failed to log in: ${failures.join(' | ')}`);
  }

  console.log(`setup: obtained ${tokens.length}/${ACCOUNTS.length} tokens`);
  return { tokens };
}

// ── Per-VU state (rolled out fresh per VU, persists per VU across iterations) ─
let vuRequestCount = 0;

export default function (data) {
  const tokens = data.tokens;
  if (!tokens || tokens.length === 0) {
    throw new Error('no tokens available from setup');
  }

  const token = tokens[(__VU - 1) % tokens.length];

  const roll = vuRequestCount % 10;
  vuRequestCount++;

  let path;
  let nameTag;
  if (roll < 5) {
    path = '/api/sales';
    nameTag = 'GET /api/sales';
    salesHit.add(1);
  } else if (roll < 9) {
    path = '/api/customers?limit=50';
    nameTag = 'GET /api/customers';
    customersHit.add(1);
  } else {
    path = '/api/dashboard/summary';
    nameTag = 'GET /api/dashboard/summary';
    dashboardHit.add(1);
  }

  const res = http.get(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Request-Id': `k6-read-${__VU}-${vuRequestCount}`,
    },
    redirects: 0,
    tags: { name: nameTag },
  });

  const isOk = res.status >= 200 && res.status < 300;
  successRate.add(isOk);

  if (res.status === 429) {
    read429.add(1);
  } else if (res.status >= 500) {
    readServer5xx.add(1);
  }

  switch (nameTag) {
    case 'GET /api/sales':
      if (isOk) salesOk.add(1);
      salesLatency.add(res.timings.duration);
      break;
    case 'GET /api/customers':
      if (isOk) customersOk.add(1);
      customersLatency.add(res.timings.duration);
      break;
    case 'GET /api/dashboard/summary':
      if (isOk) dashboardOk.add(1);
      dashboardLatency.add(res.timings.duration);
      break;
    default:
      break;
  }

  check(res, {
    [`${nameTag} ok`]: (r) => r.status >= 200 && r.status < 300,
    [`${nameTag} no 5xx`]: (r) => r.status < 500,
  });
}

// ── Summary ───────────────────────────────────────────────────────
// Reads metric values directly from data.metrics[<name>].values.
// Counters expose `.count`; Trends expose `.avg`, `.med`, `p(95)` etc.
const num = (n) => (typeof n === 'number' ? Number(n.toFixed(1)) : 0);

function counterCount(m, name) {
  const metric = m[name];
  if (!metric || !metric.values) return 0;
  const v = metric.values;
  if (typeof v.count === 'number') return v.count;
  return 0;
}

function trendField(m, name, field) {
  const metric = m[name];
  if (!metric || !metric.values) return 0;
  const v = metric.values;
  const raw = v[field];
  return typeof raw === 'number' ? Number(raw.toFixed(1)) : 0;
}

export function handleSummary(data) {
  console.log('METRIC NAMES:', Object.keys(data.metrics).sort().join(', '));

  const m = data.metrics;
  const total = counterCount(m, 'http_reqs');
  const rps = m.http_reqs?.values?.rate ?? 0;

  const rows = {
    'Target RPS': TARGET_RPS,
    'Duration (s)': DURATION_S,
    'Total requests': total,
    'Actual RPS': Number(rps.toFixed(2)),
    'Success rate (%)': Number(((m.read_success_rate?.values?.rate ?? 0) * 100).toFixed(2)),
    'Read 429': counterCount(m, 'read_429'),
    'Server 5xx': counterCount(m, 'read_server_5xx'),

    '─── /api/sales (50%) ───': '',
    '  dispatched': counterCount(m, 'sales_hit'),
    '  ok': counterCount(m, 'sales_ok'),
    '  avg (ms)': trendField(m, 'sales_latency_ms', 'avg'),
    '  p50 (ms)': trendField(m, 'sales_latency_ms', 'med'),
    '  p95 (ms)': trendField(m, 'sales_latency_ms', 'p(95)'),
    '  p99 (ms)': trendField(m, 'sales_latency_ms', 'p(99)'),
    '  max (ms)': trendField(m, 'sales_latency_ms', 'max'),

    '─── /api/customers (40%) ───': '',
    '  dispatched': counterCount(m, 'customers_hit'),
    '  ok': counterCount(m, 'customers_ok'),
    '  avg (ms)': trendField(m, 'customers_latency_ms', 'avg'),
    '  p50 (ms)': trendField(m, 'customers_latency_ms', 'med'),
    '  p95 (ms)': trendField(m, 'customers_latency_ms', 'p(95)'),
    '  p99 (ms)': trendField(m, 'customers_latency_ms', 'p(99)'),
    '  max (ms)': trendField(m, 'customers_latency_ms', 'max'),

    '─── /api/dashboard/summary (10%) ───': '',
    '  dispatched': counterCount(m, 'dashboard_hit'),
    '  ok': counterCount(m, 'dashboard_ok'),
    '  avg (ms)': trendField(m, 'dashboard_latency_ms', 'avg'),
    '  p50 (ms)': trendField(m, 'dashboard_latency_ms', 'med'),
    '  p95 (ms)': trendField(m, 'dashboard_latency_ms', 'p(95)'),
    '  p99 (ms)': trendField(m, 'dashboard_latency_ms', 'p(99)'),
    '  max (ms)': trendField(m, 'dashboard_latency_ms', 'max'),
  };

  const out = formatTable('Phase 3 · Read-heavy mix', rows);

  return {
    stdout: out,
    'load-tests/results/read-heavy.json': JSON.stringify(data, null, 2),
  };
}

function formatTable(title, rows) {
  const keys = Object.keys(rows);
  const pad = Math.max(...keys.map((k) => k.length)) + 2;
  let out = `\n${title}\n`;
  out += '─'.repeat(title.length + 4) + '\n';
  for (const [k, v] of Object.entries(rows)) {
    if (v === '') {
      out += `  ${k}\n`;
    } else {
      out += `  ${k.padEnd(pad)} ${v}\n`;
    }
  }
  return out + '\n';
}