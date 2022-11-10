# vhs < demo.tape
# dco run --rm vhs demo.tape

Output ./pass.gif
# Output ./demo.mp4
# Output ./demo.webm
# Output ./demo_frames/

# Set TypingSpeed 75ms
Set Framerate 25
Set Padding 30
Set FontSize 18
Set Width 800
Set Height 300

# Require deno
# Hide
# Type "deno cache --unstable https://tepi.deno.dev/src/cli.ts" Enter
# Sleep 15s
# Type "clear" Enter
#
# Show
#
# Sleep 100ms
# Type "deno install --unstable -Af -n tepi https://tepi.deno.dev/src/cli.ts"
# Sleep 300ms



Sleep 300ms
Type "cat pass.http"
Sleep 500ms
Enter

Sleep 2s

Type "tepi pass.http"
Sleep 500ms
Enter

Sleep 20s
