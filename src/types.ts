import { extractBody } from "./fetchBlock.ts";

export interface RequestInterface extends Request {
  bodyRaw?: BodyInit | null;
  bodyExtracted?: unknown;
  getBody?: () => Promise<unknown>;
}

export interface ResponseInterface extends Response {
  bodyRaw?: BodyInit | null;
  bodyExtracted?: unknown;
  getBody?: () => Promise<unknown>;
}

export class _Response extends Response implements ResponseInterface {
  bodyRaw?: BodyInit | null;
  #bodyExtracted?: unknown;

  static fromResponse(
    response: Response,
    bodyRaw?: BodyInit | null,
  ): _Response {
    const _response = new _Response(response.body, response);
    _response.bodyRaw = bodyRaw;
    return _response;
  }
  constructor(body?: BodyInit | null | undefined, init?: ResponseInit) {
    super(body, init);
    this.bodyRaw = body;
  }
  async getBody(): Promise<unknown> {
    await extractBody(this);
    return this.#bodyExtracted;
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
  async getBody(): Promise<unknown> {
    await extractBody(this);
    return this.bodyExtracted;
  }
  get bodyExtracted() {
    return this.#bodyExtracted;
  }
  set bodyExtracted(value) {
    this.#bodyExtracted = value;
  }
}

export type Meta = {

  _elapsedTime?: number | string;
  _startLine?: number;
  _endLine?: number;
  _filePath?: string;
  _relativeFilePath?: string;

  _isDoneBlock?: boolean;
  _isSuccessfulBlock?: boolean;
  _isFailedBlock?: boolean;
  _isIgnoredBlock?: boolean;
  _errorDisplayed?: boolean;

  // deno-lint-ignore no-explicit-any
  [key: string]: any;
};

export type BodyExtracted = { body: unknown; contentType: string };

export type Block = {
  description?: string;
  text?: string;
  request?: _Request;
  expectedResponse?: _Response;
  actualResponse?: _Response;
  response?: _Response;
  meta: Meta;
  error?: Error;
};

export type File = {
  path: string;
  relativePath?: string;
  blocks: Block[];
};

export type GlobalData = {
  meta: Meta;
  _files: File[];
  _blocksAlreadyReferenced: {
    [key: string]: Block;
  };
  _blocksDone: {
    [key: string]: Block;
  };
};

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
