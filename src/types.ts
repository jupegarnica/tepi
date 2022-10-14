
export type Meta = {
    hideBody?: boolean;
    hideHeaders?: boolean;
    hideRequest?: boolean;
    hideResponse?: boolean;
    [key: string]: string | boolean | undefined;
}

export interface _Request extends Request {
    bodyRaw?: BodyInit | null ;
    bodyExtracted?: unknown;
}

export interface _Response extends Response {
    bodyRaw?: BodyInit | null ;
    bodyExtracted?: unknown;
}

export type BodyExtracted = { body: unknown; contentType: string }


export type Block = {
    text?: string;
    request?: _Request;
    response?: _Response;
    meta?: Meta;
    startLine?: number;
    endLine?: number;
};


export type File = {
    path: string;
    blocks: Block[];
}

export const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
