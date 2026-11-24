const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    // Trust Railway's edge proxy headers.
    // Railway terminates TLS at the edge, so the app sees HTTP internally.
    // Override with the forwarded protocol so Next.js knows it's HTTPS.
    const forwardedProto = req.headers["x-forwarded-proto"]
    const forwardedHost = req.headers["x-forwarded-host"]

    if (forwardedProto && forwardedProto !== "http") {
      req.headers["x-forwarded-proto"] = forwardedProto
    } else {
      req.headers["x-forwarded-proto"] = "https"
    }

    if (forwardedHost) {
      req.headers["x-forwarded-host"] = forwardedHost
    }

    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, (err) => {
    if (err) throw err
    console.log("> Ready on http://localhost:3000 (Railway HTTPS proxy)")
  })
})
