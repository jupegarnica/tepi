// Local mirror of faker.deno.dev used only by the .http fixtures of the test suite.
// Semantics reconstructed from the fixtures/http expectation: endpoint echo semantics
// with ?status, ?delay, ?body and ?quiet query params.
// Started by test/global-setup.ts in vitest; HOST/HOST_HTTPBIN are pointed at it.
import http from "node:http";

const ECHO_PLACEHOLDER = "";

export function startFakerServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => handle(url, req, res, Buffer.concat(chunks).toString()));
    req.on("error", () => res.destroy());
  });

  function handle(url, req, res, rawBody) {
    const params = url.searchParams;
    const delay = Number(params.get("delay") ?? 0);
    const finish = () => respond(url, req, res, rawBody);
    if (delay > 0) setTimeout(finish, delay);
    else finish();
  }

  function respond(url, req, res, rawBody) {
    const params = url.searchParams;
    const statusParam = params.get("status");    let status = 200;
    let statusText;
    if (statusParam !== null) {
      if (statusParam.includes("-")) {
        const [lo, hi] = statusParam.split("-").map(Number);
        if (Number.isInteger(lo) && Number.isInteger(hi) && hi >= lo) {
          status = lo + Math.floor(Math.random() * (hi - lo + 1));
        }
      } else if (/^\d+$/.test(statusParam)) {
        status = Number(statusParam);
      }
    } else if (statusParam === "") {
      status = 200;
    }

    const hasBodyParam = params.has("body");
    let body = hasBodyParam ? (params.get("body") ?? "") : rawBody;
    if (!hasBodyParam && rawBody === "") body = ECHO_PLACEHOLDER;

    let contentType = "text/plain;charset=UTF-8";
    if (!hasBodyParam) {
      const reqCt = req.headers["content-type"];
      if (typeof reqCt === "string" && reqCt.trim() !== "") contentType = reqCt;
    }

    const headers = {};
    // Echo request headers into the response, like the original faker service did
    // (fixtures assert request headers reappear in the actual response).
    for (const [key, value] of Object.entries(req.headers)) {
      if (
        key === "host" || key === "connection" || key === "content-length" ||
        key === "accept-encoding" || key === "user-agent" || key === "date"
      ) continue;
      headers[key] = value;
    }
    // `quiet` mirrors the original service: request header requires runtime headers set.
    headers["content-type"] = contentType;

    if (status === 204 || status === 304) {
      res.writeHead(status, headers);
      res.end();
      return;
    }
    res.writeHead(status, { ...headers, connection: "close" });
    res.end(body);
  }

  return server;
}

export function startHttpbinLikeServer(port = 0) {
  // httpbin.org is still live; the compose stack maps it to a local port for hermetic runs.
  // Minimal support for the endpoints used by fixtures when running fully offline:
  // /status/:n, /html, /get, /anything, /json, /gzip.
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const m = url.pathname.match(/^\/status\/(\d+)$/);
    const t = Date.now();
    const h = req.headers["content-type"] ?? "application/json";
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (m) {
        res.writeHead(Number(m[1]));
        res.end();
        return;
      }
      if (url.pathname === "/html") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html><body><h1>Herman Melville</h1><p>Availing himself of the mild, summer-weather</p></body></html>");
        return;
      }
      if (url.pathname === "/json") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          slideshow: { title: "Sample Slide Show" },
        }));
        return;
      }
      res.writeHead(200, { "content-type": h });
      res.end(JSON.stringify({ url: req.url, headers: req.headers, args: {} }));
    });
  });
  return server;
}

if (import.meta.main) {
  const port = Number(process.argv[2] ?? 8000);
  startFakerServer(port).listen(port, () => console.log(`faker mock on :${port}`));
}
