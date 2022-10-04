import { type Args, parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.126.0/fmt/colors.ts";

const args: Args = parse(Deno.args);

if (import.meta.main) {
  await runFetch(args);
}

async function runFetch(args: Args): Promise<void> {
  const url = new URL(`${args._.join("")}`);

  // create headers
  const headers = new Headers();
  const header = Array.isArray(args.header) ? args.header : [args.header];
  for (const txt of header) {
    const [key, value] = txt.replace(":", "<<::>>").split("<<::>>");
    headers.set(key.trim(), value.trim());
  }

  const init: RequestInit = {
    method: args.method || "GET",
    headers,
    body: args.body || null,
    cache: args.cache || "default",
    credentials: args.credentials || "same-origin",
    redirect: args.redirect || "follow",
    referrer: args.referrer || "client",
    referrerPolicy: args.referrerPolicy || "no-referrer",
    integrity: args.integrity || "",
    keepalive: args.keepalive || false,
    mode: args.mode || "cors",
    // signal: args.signal || null,
  };

  const request: Request = new Request(url, init);

  // Run:
  try {
    console.log(await castRequestToHttpText(request));

    const response = await fetch(request);

    console.log(await castResponseToHttpText(response));
  } catch (error) {
    console.log(error);
  }
}

function extractBody(re: Response | Request): unknown {
  if (!re.bodyUsed) return "";

  const contentType = re.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return re.json();
  } else if (contentType && contentType.includes("text/html")) {
    return re.text();
  } else if (contentType && contentType.includes("text/plain")) {
    return re.text();
  } else if (contentType && contentType.includes("application/octet-stream")) {
    return re.arrayBuffer();
  } else if (
    contentType && contentType.includes("application/x-www-form-urlencoded")
  ) {
    return re.formData();
  } else {
    return re.blob();
  }
}

async function castResponseToHttpText(response: Response): Promise<string> {
  const body = await extractBody(response);

  const status = response.ok
    ? colors.green(`${response.status}`)
    : colors.red(`${response.status}`);
  const statusText = response.statusText;
  const headers = [...response.headers.entries()]
    .map(([key, value]) => `${colors.blue(key)}: ${colors.white(value)}`).join(
      "\n",
    );
  // const contentType = headers.get("content-type");

  const bodyStr = typeof body === "string"
    ? body
    : JSON.stringify(body, null, 2);

  return `${colors.bold(`HTTP/1.1 ${status} ${statusText}`)}
${colors.dim(headers)}

${bodyStr}
`;
}

async function castRequestToHttpText(request: Request): Promise<string> {
  const body = await extractBody(request);
  const method = request.method;
  const url = request.url;
  const headers = [...request.headers.entries()]
    .map(([key, value]) => `${colors.blue(key)}: ${colors.white(value)}`).join(
      "\n",
    );

  return (
    `
${colors.bold(`${method} ${url}`)}
${colors.dim(headers)}

${body}
`
  );
}
