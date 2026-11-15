import http from "k6/http"
import { check, sleep } from "k6"
import { Counter, Rate, Trend } from "k6/metrics"

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    // Availability: 99% of requests must succeed
    http_req_failed: ["rate<0.01"],
    // Latency: 95% of requests under 2s
    http_req_duration: ["p(95)<2000"],
    // Custom: error rate under 1%
    errors: ["rate<0.01"],
  },
}

const errors = new Counter("errors")
const errorRate = new Rate("errors")
const docDuration = new Trend("doc_duration")

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  const healthOk = check(healthRes, {
    "health status is 200": (r) => r.status === 200,
  })
  if (!healthOk) {
    errors.add(1)
    errorRate.add(1)
  }

  // Documents list (unauthenticated - expect 401, not 500)
  const docsRes = http.get(`${BASE_URL}/api/documents`)
  const docsOk = check(docsRes, {
    "documents not server error": (r) => r.status !== 500,
  })
  if (!docsOk) {
    errors.add(1)
    errorRate.add(1)
  }

  docDuration.add(healthRes.timings.duration)

  sleep(1)
}
