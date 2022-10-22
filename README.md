

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

* -w, --watch         Watch files for changes and rerun tests.
* -t, --timeout       Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* -f, --fail-fast     Stop running tests after the first failure.
* -d, --display       Set the display mode. (none, minimal, default and full)
                            none: display nothing
                            minimal: display only final result
                            default: display list results and errors
                            full: display all requests and responses
* -h, --help         output usage information
*   , --init      create example.http test file

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


# HTTP syntax:

You can use the standard HTTP syntax in your .http files as follow:

```http
POST https://example.com/
Authorization: Bearer 123
Content-Type: application/json

{"name": "Garn"}

### separate requests with 3 #
# comment a line with
# use @ tu include metadata
# @name example

GET /?body=hola
host: https://faker.deno.dev

# write the expected response to validate the actual response
HTTP/1.1 200 OK

{"name": "Garn"}
```

Run `httest --init` to create a example.http file to know more about the syntax.


