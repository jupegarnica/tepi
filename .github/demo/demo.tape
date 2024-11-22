# dco run --rm vhs demo.tape

Output ./demo.gif
# Output ./demo.ascii
Set Framerate 10
Set Padding 30
Set FontSize 17
Set Width 800
Set Height 1150

Require deno

Hide
Type "deno cache --unstable ../../src/cli.ts"
Enter
Type "deno install --global --unstable -Af -n tepi ../../src/cli.ts"
Type "deno cache -A npm:cli-highlight" Enter
Type "alias cat='deno run -A npm:cli-highlight'" Enter
Sleep 15s
Type clear Enter
Show

Type "cat demo.http"
Sleep 300ms
Enter

Sleep 1s

Type "tepi demo.http"
Sleep 300ms
Enter

Sleep 25s
