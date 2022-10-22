import { extractBody } from "./fetchBlock.ts";

export interface RequestInterface extends Request {
  bodyRaw?: BodyInit | null;
  bodyExtracted?: unknown;
  extractBody?: () => Promise<unknown>;
}

export interface ResponseInterface extends Response {
  bodyRaw?: BodyInit | null;
  bodyExtracted?: unknown;
  extractBody?: () => Promise<unknown>;
}

export class _Response extends Response implements ResponseInterface {
  bodyRaw?: BodyInit | null;
  #bodyExtracted?: unknown;

  static fromResponse(response: Response): _Response {
    const _response = new _Response(response.body, response);
    _response.bodyRaw = response.body;
    return _response;
  }
  constructor(body?: BodyInit | null | undefined, init?: ResponseInit) {
    super(body, init);
    this.bodyRaw = body;
  }
  async extractBody(): Promise<void> {
    if (this.bodyUsed) return;
    await extractBody(this);
  }
  get bodyExtracted() {
    return this.#bodyExtracted;
  }
  set bodyExtracted(value) {
    this.#bodyExtracted = value;
  }
}

export class _Request extends Request implements RequestInterface {
  bodyRaw?: BodyInit | null;
  #bodyExtracted?: unknown;
  constructor(input: RequestInfo, init?: RequestInit) {
    super(input, init);
    this.bodyRaw = init?.body;
  }
  async extractBody(): Promise<void> {
    if (this.bodyUsed) return;
    await extractBody(this);
  }

  get bodyExtracted() {
    return this.#bodyExtracted;
  }
  set bodyExtracted(value) {
    this.#bodyExtracted = value;
  }
}

export type Meta = {
  elapsedTime?: number | string;
  startLine?: number;
  endLine?: number;
  filePath?: string;
  relativeFilePath?: string;
  [key: string]: number | string | boolean | undefined;
};

export type BodyExtracted = { body: unknown; contentType: string };

export type Block = {

  text?: string;
  description?: string;
  request?: _Request;
  expectedResponse?: _Response;
  actualResponse?: _Response;
  meta: Meta;
  error?: Error;
};

export type File = {
  path: string;
  blocks: Block[];
};

export type GlobalData = {
  meta: Meta,
  [key: string]: unknown;
}

// FETCH VALID HTTP METHODS

export const httpMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
];

// export const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
