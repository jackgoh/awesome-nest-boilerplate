FROM node:24 AS build

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn install --immutable

COPY . ./

RUN yarn build:prod
RUN yarn workspaces focus --all --production

FROM node:24

ARG PORT=3000

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules

EXPOSE $PORT

CMD ["node", "dist/main.js"]
