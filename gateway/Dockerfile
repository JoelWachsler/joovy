FROM node:16

RUN mkdir -p /server
WORKDIR /server

# Cache
ADD package.json .
ADD yarn.lock .
RUN yarn
ADD . .

CMD yarn start
