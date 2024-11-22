# dco run --rm vhs demo.tape
#  vhs < demo.tape

Output ./demo.gif
# Output ./demo.ascii
Set Shell zsh
Set Theme "Monokai Pro"
# Set FontFamily "Fira Code"
Set TypingSpeed 100ms
Set Framerate 10
Set Padding 30
Set FontSize 17
Set Width 800
Set Height 1150
Set LineHeight 1.5
Set WindowBar Colorful
Set MarginFill "#dddddd"
Set Margin 10
Set BorderRadius 10

Require deno
Require tepi
Require bat

Hide
# Type "deno cache --unstable ../../src/cli.ts"
# Enter
# Type "deno install --global --unstable -Af -n tepi ../../src/cli.ts"
# Type "deno cache -A npm:cli-highlight" Enter
# Type "alias cat='deno run -A npm:cli-highlight --language http --theme theme.json'" Enter
Type "alias cat='batcat --style=snip'" Enter
Type clear Enter
Sleep 1s
Show

Type "cat demo.http"
Sleep 300ms
Enter

Sleep 3s

Type "tepi demo.http"
Sleep 300ms
Enter

Sleep 10s
# Sleep 2s
