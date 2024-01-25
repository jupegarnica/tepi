FROM denoland/deno:alpine-1.40.0
WORKDIR /app
COPY ./src ./src
COPY ./deno.jsonc ./deno.jsonc
COPY ./deno.lock ./deno.lock
RUN deno task install
ENTRYPOINT [ "tepi" ]
COPY ./docs ./docs
WORKDIR /app/http
CMD [ "**/*.http" ]