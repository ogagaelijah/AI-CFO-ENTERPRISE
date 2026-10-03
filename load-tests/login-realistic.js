// load-tests/login-realistic.js
// v2.1.0 — Real login latency test that respects the email rate limiter.
//
// Fires 5 req/s for 90 seconds = 450 requests, rotating across 50 test
// accounts. That's 9 requests per account — under the 10/15min email
// limit and under the 20/15min IP limit. So no 429s are expected and
// every request measures true bcrypt → JWT → cookie-set latency.
//
// This is the number that matters for user experience.
//
// Prerequisites:
//   Run scripts/create-loadtest-accounts.js once before this.
//
// Run:
//   k6 run load-tests/login-realistic.js
//
// Env vars:
//   BASE_URL            default http://localhost:5000
//   LOADTEST_PASSWORD   default LoadTest2026!

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PASSWORD = __ENV.LOADTEST_PASSWORD || 'LoadTest2026!';

const TARGET_RPS = 5;
const DURATION_S = 90;

// 50 pre-registered accounts. Each VU/iteration picks one.
// 450 requests / 50 accounts = 9 per account — under the 10/15min cap.
const ACCOUNTS = Array.from(
  { length: 50 },
  (_, i) => `loadtest${String(i + 1).padStart(2, '0')}@aicfo.test`
);

// ── Custom metrics ────────────────────────────────────────────────
const success = new Counter('login_success');
const rejected = new Counter('login_rejected_429');
const other4xx = new Counter('login_other_4xx');
const server5xx = new Counter('login_server_5xx');

const loginLatency = new Trend('login_latency_ms', true);
const successRate = new Rate('login_success_rate');

export const options = {
  scenarios: {
    realistic_login: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: `${DURATION_S}s`,
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    'login_latency_ms': ['p(95)<500', 'p(99)<1000'],
    'login_rejected_429': ['count==0'],
    'login_server_5xx': ['count==0'],
    'login_success_rate': ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  // Pick an account deterministically: __ITER increments per VU,
  // __VU also increments. Combined, this distributes evenly.
  const idx = (__VU * 7 + __ITER) % ACCOUNTS.length;
  const email = ACCOUNTS[idx];

  const payload = JSON.stringify({ email, password: PASSWORD });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `k6-login-${__VU}-${__ITER}`,
    },
    redirects: 0,
    tags: { name: 'POST /api/auth/login' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  if (res.status === 200) {
    success.add(1);
    loginLatency.add(res.timings.duration);
    successRate.add(true);
  } else if (res.status === 429) {
    rejected.add(1);
    successRate.add(false);
  } else if (res.status >= 500) {
    server5xx.add(1);
    successRate.add(false);
  } else {
    other4xx.add(1);
    successRate.add(false);
  }

  check(res, {
    'login succeeded (200)': (r) => r.status === 200,
    'auth cookie set': (r) => !!r.headers['Set-Cookie'],
    'no rate limit (429)': (r) => r.status !== 429,
    'no server error (5xx)': (r) => r.status < 500,
  });
}

export function handleSummary(data) {
  const m = data.metrics;

  const total = m.http_reqs?.values?.count ?? 0;
  const rate = m.http_reqs?.values?.rate ?? 0;
  const ok = m.login_success?.values?.count ?? 0;
  const rej = m.login_rejected_429?.values?.count ?? 0;
  const c4xx = m.login_other_4xx?.values?.count ?? 0;
  const s5xx = m.login_server_5xx?.values?.count ?? 0;
  const successPct = ((m.login_success_rate?.values?.rate ?? 0) * 100).toFixed(2);

  const avg = m.login_latency_ms?.values?.avg ?? 0;
  const p50 = m.login_latency_ms?.values?.med ?? 0;
  const p90 = m.login_latency_ms?.values?.['p(90)'] ?? 0;
  const p95 = m.login_latency_ms?.values?.['p(95)'] ?? 0;
  const p99 = m.login_latency_ms?.values?.['p(99)'] ?? 0;
  const max = m.login_latency_ms?.values?.max ?? 0;

  const rows = {
    'Target RPS': TARGET_RPS,
    'Duration (s)': DURATION_S,
    'Accounts rotated': ACCOUNTS.length,
    'Total requests': total,
    'Actual RPS': Number(rate.toFixed(2)),
    'Success (200)': ok,
    'Rejected (429)': rej,
    'Other 4xx': c4xx,
    'Server 5xx': s5xx,
    'Success rate (%)': successPct,
    'Login latency avg (ms)': Number(avg.toFixed(1)),
    'Login latency p50 (ms)': Number(p50.toFixed(1)),
    'Login latency p90 (ms)': Number(p90.toFixed(1)),
    'Login latency p95 (ms)': Number(p95.toFixed(1)),
    'Login latency p99 (ms)': Number(p99.toFixed(1)),
    'Login latency max (ms)': Number(max.toFixed(1)),
  };

  const out = formatTable('Phase 3 · Realistic login latency', rows);

  return {
    stdout: out,
    'load-tests/results/login-realistic.json': JSON.stringify(data, null, 2),
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