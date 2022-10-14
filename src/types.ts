
export type Meta = {
    hideBody?: boolean;
    hideHeaders?: boolean;
    hideRequest?: boolean;
    hideResponse?: boolean;
    [key: string]: string | boolean | undefined;
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
    request?: _Request;
    response?: _Response;
    actualResponse?: _Response;
    meta?: Meta;
    startLine?: number;
    endLine?: number;
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
