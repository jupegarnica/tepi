import { type Args } from "https://deno.land/std@0.178.0/flags/mod.ts";
import { legacy_createStore as createStore, Reducer } from "npm:redux";
import { Block, File } from "./types.ts";


export type Message = {
  message: string;
  color: string;
};
export type State = {
  messages: Message[];
  blocks: Block[];
  filePaths: string[];
  files: File[];
  cliArgs?: Args;

};

export type Action = {
  type: string;
  payload?: any;
};


export const initState: State = {
  messages: [],
  blocks: [],
  filePaths: [],
  files: [],

};

export const reducer: Reducer<State, Action> = (state: State = initState, action: Action): State => {
  switch (action.type) {
    case 'SHOW_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload as Message]
      };

    case 'SET_FILE_PATHS':
      return {
        ...state,
        filePaths: action.payload
      };

    case 'SET_CLI_ARGS':
      return {
        ...state,
        cliArgs: action.payload
      };

    case 'SET_FILES':
      return {
        ...state,
        // files: action.payload,
        blocks: action.payload.flatMap((f: any) => f.blocks)
      };
    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b: any) => b.meta._id === action.payload.meta._id ? action.payload : b),
      };

    default:
      return state;
  }
}


export const store = createStore(reducer);

export const dispatch = store.dispatch;