
export type Meta = {
    [key: string]: number | string | boolean | undefined;
}

export interface _Request extends Request {
    bodyRaw?: BodyInit | null;
    bodyExtracted?: unknown;
    httpText?: string;
}

export interface _Response extends Response {
    bodyRaw?: BodyInit | null;
    bodyExtracted?: unknown;
    httpText?: string;
}

export type BodyExtracted = { body: unknown; contentType: string }


export type Block = {
    text?: string;
    description?: string;
    request?: _Request;
    expectedResponse?: _Response;
    actualResponse?: _Response;
    meta?: Meta;
    startLine?: number;
    endLine?: number;
    filePath?: string;
    error?: Error;
};


export type File = {
    path: string;
    blocks: Block[];
}


// FETCH VALID HTTP METHODS

export const httpMethods = [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'CONNECT',
    'OPTIONS',
    'TRACE',
    'PATCH',
];

// export const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
