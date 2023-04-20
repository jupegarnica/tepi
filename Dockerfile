FROM denoland/deno
WORKDIR /app
COPY . .
RUN deno task install
CMD tepi
