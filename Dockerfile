FROM node:24.16.0-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global pnpm@11.12.0

WORKDIR /usr/src/app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile
RUN pnpm install --offline --frozen-lockfile

FROM dependencies AS build

COPY . .
RUN pnpm run build:prod

FROM base AS production-dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --prod --frozen-lockfile
RUN pnpm install --prod --offline --frozen-lockfile --ignore-scripts
RUN pnpm rebuild bcrypt

FROM node:24.16.0-bookworm-slim AS runtime

ENV NODE_ENV="production"
ENV PORT="3000"

WORKDIR /usr/src/app

COPY --chown=node:node package.json ./
COPY --chown=node:node --from=production-dependencies /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/main.js"]
