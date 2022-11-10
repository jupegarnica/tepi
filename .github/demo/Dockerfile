# syntax=docker/dockerfile:1

FROM golang:1.18-alpine as builder

WORKDIR /app

COPY . .
RUN go mod download


RUN go build -o /vhs



FROM tsl0922/ttyd:alpine as ttyd
FROM denoland/deno:alpine

# Create volume
VOLUME /vhs

# Install latest ttyd
COPY --from=ttyd /usr/bin/ttyd /usr/bin/ttyd

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

# Expose port
EXPOSE 1976

WORKDIR /vhs

# Install Dependencies
RUN apk add --no-cache ffmpeg chromium bash shadow

# Create user
RUN useradd -u 1976 -U -s /bin/false vhs

# Install
COPY --from=builder /vhs /usr/bin/

ENV VHS_PORT "1976"
ENV VHS_HOST "0.0.0.0"
ENV VHS_GID "1976"
ENV VHS_UID "1976"
ENV VHS_KEY_PATH "/vhs/vhs"
ENV VHS_AUTHORIZED_KEYS_PATH ""



RUN apk add bat
RUN deno cache --unstable https://tepi.deno.dev/src/cli.ts
RUN deno install --unstable -Af -n tepi https://tepi.deno.dev/src/cli.ts

ENTRYPOINT ["/usr/bin/vhs"]