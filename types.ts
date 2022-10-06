
export type Meta = {
    hideBody?: boolean;
    hideHeaders?: boolean;
    hideRequest?: boolean;
    hideResponse?: boolean;
}

export interface RequestUnused extends Request {
    bodyRaw?: BodyInit;
}

export interface ResponseUsed extends Response {
    bodyExtracted?: unknown;
}

export type BodyExtracted = { body?: BodyInit; contentType: string }


export type Block = {
    request: RequestUnused;
    response?: ResponseUsed;
};