import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

export const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
    errors: ['rate<0.01'],             // Custom error rate < 1%
  },
}

const BASE_URL = __ENV.BASE_URL || 'https://your-app.railway.app'

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  sleep(1)

  // Test authenticated endpoints (requires auth token)
  // In production, you would authenticate first
  const authToken = 'your-test-token-here' // Set via environment variable
  
  if (authToken) {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    }

    // Test documents list
    const docsRes = http.get(`${BASE_URL}/api/documents`, { headers })
    check(docsRes, {
      'documents list status 200': (r) => r.status === 200,
      'documents list response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1)

    sleep(1)

    // Test document creation
    const docPayload = JSON.stringify({
      title: 'Load Test Document',
      description: 'Load test document',
    })
    const createRes = http.post(`${BASE_URL}/api/documents`, docPayload, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
    check(createRes, {
      'create document status 201': (r) => r.status === 201,
    }) || errorRate.add(1)

    sleep(1)

    // Test conversion
    const convertRes = http.post(
      `${BASE_URL}/api/conversion`,
      JSON.stringify({
        source_url: 'https://example.com/test.pdf',
        target_format: 'docx',
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    )
    check(convertRes, {
      'conversion status 201': (r) => r.status === 201,
    }) || errorRate.add(1)

    sleep(1)

    // Test health check
    const healthRes2 = http.get(`${BASE_URL}/api/health`, { headers })
    check(healthRes2, {
      'health check after load status 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  } else {
    console.log('No auth token provided, skipping authenticated tests')
  }

  sleep(1)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  }
}

function textSummary(data, options) {
  const indent = options.indent || ''
  const colors = options.enableColors
  let output = ''

  output += `${indent}k6 Load Test Results\n`
  output += `${indent}=====================\n\n`

  // HTTP requests
  output += `${indent}HTTP Requests:\n`
  output += `${indent}  Total: ${data.metrics.http_reqs.values.count}\n`
  output += `${indent}  Failed: ${data.metrics.http_req_failed.values.passes}\n`
  output += `${indent}  Duration (p95): ${data.metrics.http_req_duration.values['p(95)']}ms\n`
  output += `${indent}  Duration (p99): ${data.metrics.http_req_duration.values['p(99)']}ms\n\n`

  // Errors
  output += `${indent}Errors:\n`
  output += `${indent}  Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`

  // Checks
  output += `${indent}Checks:\n`
  Object.entries(data.checks).forEach(([name, check]) => {
    const passRate = (check.passes / (check.passes + check.fails) * 100).toFixed(1)
    output += `${indent}  ${name}: ${passRate}% (${check.passes}/${check.passes + check.fails})\n`
  })

  return output
}