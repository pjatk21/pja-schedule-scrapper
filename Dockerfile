FROM node:lts-alpine

RUN apk add chromium git bash

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN adduser -D -s /bin/bash scrapper

WORKDIR /app

COPY . /app

RUN chown -R scrapper /app

USER scrapper

RUN yarn install

RUN yarn build

ENTRYPOINT node dist/bin.js loop --loopSize 21
