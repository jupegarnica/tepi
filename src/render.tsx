import { render, Text, Box, useInput, useFocus, Static } from 'npm:ink';
import React from 'npm:react';
import { type State, store, Message } from "./store.ts";
import { Block } from './types.ts';

function App() {
    const [state, setState] = React.useState<State>(store.getState());
    React.useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            setState(store.getState());
        });
        return unsubscribe;
    }, []);
    // state.blocks.length = 10;
    const blocks = state.blocks.filter((block: Block) => block.request)
    const messages = state.messages as Message[];
    return (
        <Box flexDirection="column">
            <Box flexDirection="column">
                {blocks.map((block: Block) => {
                    return (
                        <Box key={block.meta._id} gap={1} >
                            <Box width={30} >
                                <Text dimColor  >{block.meta._relativeFilePath}</Text>
                            </Box>
                            <Text bold color="blackBright"  >{block.description}</Text>
                            <Text bold color="blackBright"  >{block.meta._isFetching ? '...' : ''}</Text>
                            <Text bold color="blackBright"  >{block.meta._isSuccessfulBlock ? 'ok' : ''}</Text>
                            <Text bold color="blackBright"  >{block.meta._isFailedBlock ? '' : ''}</Text>

                        </Box>
                    )
                })}
            </Box>
            <Box flexDirection="column" >
                {messages.map(
                    ({ message, color }) => (
                        <Box
                            key={message}
                            borderColor={color}
                            borderStyle="round"
                        >
                            <Text color={color} >{message}</Text>
                        </Box>
                    )
                )}

            </Box>
        </Box >

    )
}

setInterval(() => {
    store.dispatch({ type: 'INCREMENT' });
}, 1000)

export async function renderUI() {

    const instance = render(<App />, {
        exitOnCtrlC: true,
        patchConsole: false,
        // debug: true,
        // stdin: Deno.stdin,
        // stdout: Deno.stdout,
        // stderr: Deno.stderr,
    });
    await instance.waitUntilExit();
    // console.log('exiting');

}
