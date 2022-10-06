
export type Meta = {
    hideBody?: boolean;
    hideHeaders?: boolean;
    hideRequest?: boolean;
    hideResponse?: boolean;
}

export interface ResponseUsed extends Response {
    bodyParsed?: unknown;
}

export interface RequestUnused extends Request {
    bodyParsed?: BodyInit;
}

export type BodyExtracted = { body?: BodyInit; contentType: string }