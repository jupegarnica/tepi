import { extractReqAndResAndMeta } from "./extractReqAndResAndMeta.ts";
import { fetchRequest } from "./fetch.ts";
import { _Response } from "./types.ts";





export async function fetchBlock(txt: string): Promise<_Response | void> {

    const block = extractReqAndResAndMeta(txt);
    if (block.request) {
        return await fetchRequest(block.request, block.meta, block.response);
    }

}
