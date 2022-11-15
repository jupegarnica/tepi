# FROM ghcr.io/charmbracelet/vhs

# COPY --from=ghcr.io/charmbracelet/vhs /vhs /vhs

FROM denoland/deno:alpine

COPY --from=ghcr.io/charmbracelet/vhs /usr/bin/vhs /usr/bin/vhs
RUN chmod +x /usr/bin/vhs

# Install Fonts
RUN apk add --no-cache \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing \
    font-adobe-source-code-pro font-source-code-pro-nerd \
    font-bitstream-vera-sans-mono-nerd \
    font-dejavu font-dejavu-sans-mono-nerd \
    font-fira-code font-fira-code-nerd \
    font-hack font-hack-nerd \
    font-ibm-plex-mono-nerd \
    font-inconsolata font-inconsolata-nerd \
    font-jetbrains-mono font-jetbrains-mono-nerd \
    font-liberation font-liberation-mono-nerd \
    font-noto \
    font-roboto-mono \
    font-ubuntu font-ubuntu-mono-nerd \
    font-noto-emoji

# Install VHS Dependencies
RUN apk add --no-cache ffmpeg chromium bash shadow
COPY --from=tsl0922/ttyd:alpine /usr/bin/ttyd /usr/bin/ttyd


# INSTALL TEPI
RUN deno cache --unstable https://tepi.deno.dev/src/cli.ts
RUN deno install --unstable -Af -n tepi https://tepi.deno.dev/src/cli.ts

# INSTALL BAT
RUN apk add bat curl
ENV COLORTERM=24bit
ENV TERM=xterm-256color

ENV BAT_OPTS="--color=always --style=numbers,changes,header,grid --tabs=2 --pager=never"

ENV FORCE_COLOR=2
ENV CLICOLOR=1
ENV CLICOLOR_FORCE=1

ENTRYPOINT ["/usr/bin/vhs"]
WORKDIR /vhs
