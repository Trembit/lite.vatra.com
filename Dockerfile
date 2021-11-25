ARG NODE_VERSION=14.17
ARG NPM_VERSION=7.16.0

FROM node:${NODE_VERSION} AS builder

RUN apt-get update && \
    apt-get -y install rsync apt-utils awscli && \
    apt-get -y remove apt-utils && \
    apt-get -y autoremove && \
    rm -rf /var/lib/apt/lists/*

RUN npm install --global webpack webpack-cli npm@${NPM_VERSION}
