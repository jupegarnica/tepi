

 _   _  _____  _____             _   
| | | ||_   _||_   _|           | |  
| |_| |  | |    | |    ___  ___ | |_ 
|  _  |  | |    | |   / _ \/ __|| __|
| | | |  | |    | |  |  __/\__ \| |_ 
\_| |_/  \_/    \_/   \___||___/ \__|
                                     
                                     


# Install:

deno install -A -f -n httest https://deno.land/x/httest/cli.ts



# Usage:

httest [OPTIONS] [FILES|GLOBS...]

# Options:

-w, --watch         Watch files for changes and rerun tests.
-t, --timeout       Set the timeout for each test in milliseconds. After the timeout, the test will fail.
-f, --fail-fast     Stop running tests after the first failure.
-d, --display       Set the display mode. (none, minimal, default and full)
                            none: display nothing
                            minimal: display only final result
                            default: display list results and errors
                            full: display all requests and responses
-h, --help         output usage information

# Examples:

`httest`
> Run all .http in the current directory and folders. (same as httest ./**/*.http)


`httest test.http ./test2.http`
> Run test.http and test2.http


`httest **/*.http`
> Run all .http in the current directory and folders.


`httest rest.http --watch`
> Run rest.http and rerun when it changes



`httest rest.http  --watch "src/**/*.ts"`
> Run rest.http and rerun when any .ts file in the src folder changes.


`httest rest.http  --watch "src/**/*.json" --watch "src/**/*.ts"`
> You can use multiple --watch flags.
> Note: You can use globs here too, but use quotes to avoid the shell expanding them.


