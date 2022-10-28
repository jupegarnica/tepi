FROM denoland/deno
WORKDIR /app
COPY . .
RUN deno cache --unstable --lock=lock.json --lock-write src/cli.ts

CMD run --allow-net --allow-read --allow-write --allow-env --unstable src/cli.ts
