FROM denoland/deno:alpine-1.32.5
WORKDIR /app
COPY ./src ./src
COPY ./deno.jsonc ./deno.jsonc
COPY ./deno.lock ./deno.lock
RUN deno task install
ENTRYPOINT [ "tepi" ]
COPY ./docs ./docs
WORKDIR /app/http
CMD [ "**/*.http" ]