
```
-------------------------
--------- TEPI ----------
-------------------------
-- An HTTP Test Runner --
-------------------------

```

# Install:

deno install --allow-read --allow-env -f -n tepi https://deno.land/x/tepi/cli.ts



# Usage:

tepi [OPTIONS] [FILES|GLOBS...]

# Options:

* -w `--watch`         Watch files for changes and rerun tests.
* -t `--timeout`       Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* -f `--fail-fast`     Stop running tests after the first failure.
* -d `--display`       Set the display mode. (none, minimal, default and full)
    * none: display nothing
    * minimal: display only final result
    * default: display list results and errors
    * full: display all requests and responses
* -h `--help`          output usage information
* -e `--env-file`     load environment variables from a .env file
*    `--no-color`     output without color

# Examples:

`tepi`
> Run all .http in the current directory and folders. (same as tepi ./**/*.http)

`tepi test.http ./test2.http`
> Run test.http and test2.http


`tepi **/*.http`
> Run all .http in the current directory and folders.


`tepi rest.http --watch`
> Run rest.http and rerun when it changes



`tepi rest.http  --watch "src/**/*.ts"`
> Run rest.http and rerun when any .ts file in the src folder changes.


`tepi rest.http  --watch "src/**/*.json" --watch "src/**/*.ts"`
> You can use multiple --watch flags.
> Note: You can use globs here too, but use quotes to avoid the shell expanding them.

`tepi --timeout 10000`
> Set the timeout for each test in milliseconds. After the timeout, the test will fail.

`tepi --fail-fast`
> Stop running tests after the first failure.

`tepi --display minimal`
> Set the display mode. (none, minimal, default and full)

`tepi --env-file .env --env-file .env.test`
> Load environment variables from a .env and .env.test


# HTTP syntax:

You can use the standard HTTP syntax in your .http files as follow:

```rest
POST https://example.com/
Authorization: Bearer 123
Content-Type: application/json

{"name": "Garn"}

### separate requests with 3 #
# comment a line with
# use @ tu include metadata
# @name example

GET /?body=hola&status=400
host: https://faker.deno.dev

# write the expected response to validate the actual response
HTTP/1.1 400 Bad Request

hola
```
