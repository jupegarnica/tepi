# vhs < fail.tape
# dco run --rm vhs fail.tape

Output ./fail.gif
Set Framerate 25
Set Padding 30
Set FontSize 18
Set Width 800
Set Height 900


Type "cat fail.http"
Sleep 300ms
Enter

Sleep 1s

Type "tepi fail.http"
Sleep 300ms
Enter

Sleep 20s
