FROM denoland/deno:alpine-2.1.1
WORKDIR /app
COPY ./src ./src
COPY ./deno.json ./deno.json
RUN deno task install
ENTRYPOINT [ "tepi" ]
COPY ./docs ./docs
WORKDIR /app/http
CMD [ "**/*.http" ]