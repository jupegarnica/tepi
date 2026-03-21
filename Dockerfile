FROM node:22-alpine
WORKDIR /app
COPY ./src ./src
COPY ./bin ./bin
COPY ./package.json ./package.json
RUN npm install --omit=dev
COPY ./docs ./docs
RUN npm link
ENTRYPOINT [ "tepi" ]
WORKDIR /app/http
CMD [ "**/*.http" ]
