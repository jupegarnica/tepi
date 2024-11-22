# dco run --rm vhs demo.tape
#  vhs < demo.tape

Output ./demo.gif
# Output ./demo.ascii
# Set Shell bash
# Set Theme "Monokai Pro"
# Set FontFamily "Monoflow"
Set Framerate 10
Set Padding 30
Set FontSize 17
Set Width 800
Set Height 1150

Require deno
Require tepi

Hide
Type "deno cache --unstable ../../src/cli.ts"
Enter
Type "deno install --global --unstable -Af -n tepi ../../src/cli.ts"
Type "deno cache -A npm:cli-highlight" Enter
Type "alias cat='deno run -A npm:cli-highlight --language http --theme theme.json'" Enter
Sleep 5s
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
