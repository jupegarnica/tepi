
## Usage:

tepi [OPTIONS] [FILES|GLOBS...]

### Options:

* `-w` `--watch`           Watch files for changes and rerun tests.
* `  ` `--watch-no-clear`  same but without clearing the screen.
* `-t` `--timeout`         Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* `-f` `--fail-fast`       Stop running tests after the first failure.
* `-d` `--display`         Set the display mode. (none, minimal, default, truncate, full and verbose)
       -  _none_:     display nothing
       -  _minimal_:  display only a minimal summary
       -  _default_:  list results and full error summary
       -  _truncate_: list results and full error summary but truncate data
       -  _full_:     display also all HTTP requests and responses and not truncate data
       -  _verbose_:  display also all metadata
* `-e` `--env-file`       load environment variables from a .env file
* `    --no-color`       output without color
* `    --no-animation`   output without terminal animations
* `    --upgrade`        upgrade to the latest version
* `    --version`        output the version number
* `-h` `--help`           output help minimal information
* `-r` `--readme`         output usage full information

### Examples:

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
