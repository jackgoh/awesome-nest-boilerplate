# Nestjs Awesome Boilerplate 

## Prerequisite
- [Node.js 24](https://github.com/nvm-sh/nvm)
- [Docker + Docker Compose](https://github.com/docker/docker-install)
- [Corepack](https://nodejs.org/api/corepack.html) for the repository-pinned Yarn 4 release

## Getting started

```bash
# 1. Clone this project
git clone https://github.com/jackgoh/awesome-nest-boilerplate {your project name}

# 2. Enter your newly-cloned folder.
cd your-project-name

# 3. Create Environment variables file.
cp .env.example .env

# 4. Enable Corepack and install the exact locked dependencies.
corepack enable
yarn install --immutable

# 5. Run DB
docker compose up
```

### Development
```bash
# 4. Run development server and open http://localhost:3000
yarn watch:dev

# 5. Read the documentation linked below for "Setup and development".
```

### Generate migration
```bash
yarn migration:generate ./src/database/migrations/{your migration name}

#Example
yarn migration:generate ./src/database/migrations/add-post-table
```

### Build

To build the App, run

```bash
yarn build:prod
```
And you will see the generated file in `dist` that ready to be served.

## Documentation

This project includes a `docs` folder with more details on:

1.  [Setup and development](https://narhakobyan.github.io/awesome-nest-boilerplate/docs/development.html#first-time-setup)
2.  [Architecture](https://narhakobyan.github.io/awesome-nest-boilerplate/docs/architecture.html)
3.  [Naming Cheatsheet](https://narhakobyan.github.io/awesome-nest-boilerplate/docs/naming-cheatsheet.html)
