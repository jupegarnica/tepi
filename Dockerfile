FROM denoland/deno:alpine-1.40.0
WORKDIR /app
COPY ./src ./src
COPY ./deno.json ./deno.json
RUN deno task install
ENTRYPOINT [ "tepi" ]
COPY ./docs ./docs
WORKDIR /app/http
CMD [ "**/*.http" ]