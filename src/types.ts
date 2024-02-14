import { extractBody } from "./fetchBlock.ts";
// TODO make-synchronous?

export class _Response extends Response {
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

export class _Request extends Request {
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
  _noAnimation?: boolean;

  _isEmptyBlock?: boolean;
  _isDoneBlock?: boolean;
  _isSuccessfulBlock?: boolean;
  _isFailedBlock?: boolean;
  _isIgnoredBlock?: boolean;
  _errorDisplayed?: boolean;

  // deno-lint-ignore no-explicit-any
  [key: string]: any;
};

export type BodyExtracted = { body: unknown; contentType: string };

export class Block {
  text: string;
  meta: Meta;
  request?: _Request;
  expectedResponse?: _Response;
  actualResponse?: _Response;
  error?: Error;
  body?: unknown;
  // #getBodySync: () => unknown;
  // #getBodyAsync:() => Promise<unknown>;

  constructor(obj: Partial<Block> = {}) {
    this.text = obj.text || "";
    this.meta = obj.meta || {};
    this.expectedResponse = obj.expectedResponse;
    this.actualResponse = obj.actualResponse;
    // this.#getBodyAsync = this.actualResponse?.getBody || ( function(): Promise<unknown> { return Promise.resolve()})
    // this.#getBodySync = makeSynchronous(this.#getBodyAsync)
  }
  // get body(): unknown {
  //   return this.#getBodySync();
  // }
  get description(): string {
    if (this.meta.description) {
      return String(this.meta.description);
    }
    if (this.meta.id) {
      return String(this.meta.id);
    }
    if (this.request) {
      return `${this.request.method} ${this.request.url}`;
    }
    return `${this.meta._relativeFilePath}:${this.meta._startLine}`;
  }
  get response() {
    return this.actualResponse;
  }
  get blockLink() {
    return `${this.meta._relativeFilePath?.replace(/^(\.\/)/, '')}:${this.meta._startLine?.toString().padEnd(5,' ')}`;
  }
}

export type File = {
  path: string;
  relativePath?: string;
  blocks: Block[];
};

export type GlobalData = {
  meta: Meta;
  _files: File[];
  _blocksAlreadyReferenced: Set<Block>;
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

export const mimesToArrayBuffer = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

export const mimesToText = [
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "application/xml",
  "text/markdown",
  "text/csv",
  "text/yaml",
  "image/svg+xml",
  "image/svg",
  "application/x-yaml",
  "application/yaml",
];

export const mimesToJSON = [
  "application/json",
  "application/ld+json",
  "application/manifest+json",
  "application/schema+json",
  "application/vnd.api+json",
  "application/vnd.geo+json",
];

export const mimesToBlob = [
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "application/docx",
  "application/x-docx",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/x-gzip",
  "application/x-bzip2",
  "application/x-xz",
  "application/x-lzma",
  "application/x-lzip",
  "application/x-lzop",
  "application/x-snappy-framed",
  "application/x-msdownload",
  "application/x-msi",
  "application/x-ms-shortcut",
  "application/x-ms-wim",
  "application/x-ms-xbap",
  "application/x-msaccess",
];

export const mimesToFormData = [
  "multipart/form-data",
  "application/x-www-form-urlencoded",
];
