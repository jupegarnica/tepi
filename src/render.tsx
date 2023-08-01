import { render, Text, Box, useInput, useFocus, useFocusManager } from 'npm:ink';
import React from 'npm:react';
import { type State, store, Message, dispatch } from "./store.ts";
import type { Block, _Request, _Response } from './types.ts';


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

type Grid = {
    col1: number,
    col2: number,
    col3: number,
    col4: number,
    col5: number,
}


function App() {
    const [state, setState] = React.useState<State>(store.getState());
    React.useEffect(() => {
        const unsubscribe = store.subscribe(() => {
            setState(store.getState());
        });
        return unsubscribe;
    }, []);
    const { focusNext, focusPrevious } = useFocusManager();

    useInput((input, key) => {
        if (key.upArrow) {
            focusPrevious();
        }
        if (key.downArrow) {
            focusNext();
        }
    })

    const col2Length = state.blocks.reduce((max: number, block: Block) => Math.max(max, block.meta._id?.length), 0);
    const gridConfig: Grid = {
        col1: 3,
        col2: 3,
        col3: col2Length,
        col4: 20,
        col5: 3,
    }
    const blocks = state.blocks.filter((block: Block) => block.request)
    const messages = state.messages as Message[];
    return (
        <Box flexDirection="column">
            <Box flexDirection="column">
                {blocks.map((block: Block) => {
                    return (
                        <BlockComponent block={block} key={block.meta._id} grid={gridConfig} />
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

function Cell({ text, width, ...props }: { text: string, width: number, [keys: string]: any }) {
    return (
        <Box width={width} >
            <Text {...props}>{text}</Text>
        </Box>
    )
}

function BlockComponent({ block, grid }: { block: Block, key: string, grid: Grid }) {
    const { isFocused } = useFocus();
    const [opened, setOpened] = React.useState(true);
    useInput((input, key) => {
        if (!isFocused) { return; }
        if (key.return || key.rightArrow || key.leftArrow || input === ' ') {
            setOpened(!opened);

        }
    })
    const dim = !isFocused;
    const id = block.meta._id.replace(/^\.\//, '');
    const arrowLeft = (isFocused ? '◀' : '◁');
    const arrowRight = (isFocused ? '▶' : '▷');
    const arrowDown = (isFocused ? '▼' : '▽');
    const icon = opened ? arrowDown : arrowRight;
    const iconColor = isFocused ? 'pink' : 'gray';
    // state: cross, check or loading
    const blockState = block.meta._isSuccessfulBlock ? '✓' : block.meta._isFailedBlock ? '✗' : '...';
    const blockStateColor = block.meta._isSuccessfulBlock ? 'green' : block.meta._isFailedBlock ? 'red' : 'gray';

    return (
        <Box flexDirection="column" >
            <Box gap={1} >
                <Cell width={grid.col1} text={icon} color={iconColor} />
                <Cell width={grid.col2} text={blockState} dimColor={dim} color={blockStateColor} />
                <Cell width={grid.col3} text={id} dimColor />
                <Cell width={grid.col4} text={block.description} dimColor={dim} bold color="blackBright" />


            </Box>
            <Box display={opened ? 'flex' : 'none'} flexDirection="column">
                {block.request && (<RequestComponent label="Request" request={block.request} />)}
                {block.response && (<ResponseComponent label="Expected Response" response={block.response} />)}
                {block.actualResponse && (<ResponseComponent label="Actual Response" response={block.actualResponse} />)}
                {block.error && (<ErrorComponent label="Error" error={block.error} />)}
            </Box>
        </Box>

    )
}

function BodyComponent({ body }: { body: unknown }) {
    let bodyString = '';
    if (typeof body === 'object') {
        bodyString = JSON.stringify(body, null, 2);
    } else {
        bodyString = body as string;
    }

    return (
        <Text color="black">{bodyString}</Text>
    )
}

function ErrorComponent({ error, label = '' }: { error: Error, label?: string }) {

    return (
        <Box>
            <Box width={2}></Box>
            <Box>
                <Box width={2}></Box>

                <Text dimColor color="white">{label}</Text>
                <Box width={2}></Box>

                <Box flexDirection="column" >
                    <Text color="black">{error.message}</Text>
                </Box>
            </Box>
        </Box>
    )

}


function RequestComponent({ request, label = '' }: { request: _Request, label?: string }) {
    return (
        <Box>
            <Box width={2}></Box>
            <Box>
                <Box width={2}></Box>

                <Text dimColor color="white">{label}</Text>
                <Box width={2}></Box>

                <Box flexDirection="column" >
                    <Text color="black">{request.method} {request.url}</Text>
                    <BodyComponent body={request.bodyExtracted} />
                </Box>
            </Box>
        </Box>
    )
}



function ResponseComponent({ response, label = '' }: { response: _Response, label?: string }) {
    return (
        <Box>
            <Box width={2}></Box>
            <Box>
                <Box width={2}></Box>

                <Text dimColor color="white">{label}</Text>
                <Box width={2}></Box>

                <Box flexDirection="column" >
                    <Text color="black">{response.status} {response.statusText}</Text>
                    <BodyComponent body={response.bodyExtracted} />
                </Box>
            </Box>
        </Box>
    )
}
