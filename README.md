# 🚀 Awesome NestJS Boilerplate

[![NestJS](https://img.shields.io/badge/NestJS-v11.1.28-red?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🎯 An opinionated, production-ready NestJS boilerplate with TypeScript, PostgreSQL, and modern development tools

## 🙏 Credits

This project is based on the amazing work by **Narek Hakobyan** 🇦🇲  
**Original Repository**: [awesome-nest-boilerplate](https://github.com/NarHakobyan/awesome-nest-boilerplate/) ⭐

Special thanks to Narek for creating such a comprehensive and well-structured NestJS boilerplate that serves as the foundation for this project.

---

## 📋 Prerequisite

- 🟢 [Node.js 24.16+](https://github.com/nvm-sh/nvm)
- 🐳 [Docker + Docker Compose](https://github.com/docker/docker-install)
- 📦 [pnpm 11.12+](https://pnpm.io/installation) - `corepack enable`

## 🛠️ Tech Stack

| Technology        | Version  | Purpose                       |
| ----------------- | -------- | ----------------------------- |
| 🏗️ **NestJS**     | v11.1.28 | Progressive Node.js framework |
| 💪 **TypeScript** | v7.0.2   | Native production compiler    |
| 🗄️ **TypeORM**    | v1.0.0   | Database ORM                  |
| 🐘 **PostgreSQL** | v16      | Primary database              |
| 🔴 **Redis**      | v7       | Cache and shared state        |
| 🔍 **Oxlint**     | v1.73.0  | Type-aware backend linting    |
| 🎨 **Prettier**   | v3.9.5   | Code formatting               |
| 🐺 **Husky**      | v9.1.7   | Git hooks for code quality    |
| 🧪 **Jest**       | v30.4.2  | Testing framework             |
| 📚 **Swagger**    | v11.4.5  | API documentation             |
| 🔐 **JWT**        | v11.0.2  | Authentication                |

## 🚀 Getting Started

```bash
# 1. Clone this project
git clone https://github.com/moinulse/awesome-nest-boilerplate {your project name}

# 2. Enter your newly-cloned folder
cd your-project-name

# 3. Create Environment variables file
cp .env.example .env

# 4. Install dependencies
pnpm install --frozen-lockfile

# 5. Start PostgreSQL and Redis
docker compose up -d
```

## 🔥 Development

```bash
# 4. Run development server and open http://localhost:3000
pnpm watch:dev

# Alternative development start
pnpm start:dev

# View API documentation (Swagger)
# Navigate to: http://localhost:3000/documentation
```

## 🧪 Testing & Code Quality

```bash
# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e
```

## 🔄 Database Operations

```bash
# Generate a new migration
pnpm migration:generate ./src/database/migrations/{migration-name}

# Example: Add post table
pnpm migration:generate ./src/database/migrations/add-post-table

# Run pending migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Create empty migration file
pnpm migration:create ./src/database/migrations/{migration-name}
```

## 🏗️ Build & Deploy

```bash
# Build for production
pnpm build:prod

# Start production server
pnpm start:prod
```

## ⚡ Features

- ✅ **JWT Authentication** - Default-deny bearer authentication with refresh-token rotation
- ✅ **Role-based Access Control** - User permissions and roles
- ✅ **API Documentation** - Auto-generated Swagger docs
- ✅ **Database Migrations** - TypeORM migration system
- ✅ **Sortable IDs** - RFC 9562 UUIDv7 generation with UUIDv4 compatibility
- ✅ **Environment Configuration** - Validated development, test, and production configs
- ✅ **Input Validation** - Request validation with class-validator
- ✅ **Error Handling** - Comprehensive error handling
- ✅ **Logging** - Structured logging system
- ✅ **Health Checks** - Application health monitoring
- ✅ **Rate Limiting** - Globally enforced limits with stricter authentication policies
- ✅ **CORS Support** - Validated origin allowlist
- ✅ **Security Headers** - Helmet.js security headers
- ✅ **Code Quality** - Oxlint, Prettier, Husky pre-commit hooks
- ✅ **Testing Setup** - Unit and E2E testing with Jest

## 🔐 Authentication model

This boilerplate exposes bearer-token APIs. Login returns access and refresh
tokens in JSON; it does not set authentication cookies. Send access tokens as
`Authorization: Bearer <access-token>`. Send refresh tokens in the validated
JSON body for `/auth/refresh` and `/auth/logout`.

Authentication is global and default-deny. Only endpoints marked with the
`@Public()` decorator bypass JWT validation. Refresh tokens rotate atomically in
Redis, and replaying a consumed token revokes the active token family. JWTs use
RS256, validate an environment-specific issuer and audience, and enforce strict
access- and refresh-claim contracts built around `sub`, `jti`, and `sid`.
Session logout blacklists its `sid` until all access tokens from that session
expire. `POST /auth/logout-all` atomically revokes and blacklists every active
session owned by the authenticated user; a later login creates an unaffected
session.

## 🔧 Code Quality & Git Hooks

This project uses modern tooling for maintaining code quality:

- 🔍 **Oxlint** with TypeScript-aware correctness and safety rules
- 🐺 **Husky v9** for Git hooks
- 📝 **lint-staged** for pre-commit linting
- 💬 **commitlint** for conventional commit messages

Git hooks are automatically set up when you run `pnpm install`. The hooks will:

- 🔍 Run Oxlint and Prettier on staged files before commit
- ✅ Validate commit messages follow conventional commit format

## 📚 Documentation

This project includes comprehensive documentation:

1. 🛠️ [Setup and Development](docs/development.md)
2. 🏗️ [Architecture](docs/architecture.md)
3. 📝 [Naming Cheatsheet](docs/naming-cheatsheet.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- 🙏 **Narek Hakobyan** for the original [awesome-nest-boilerplate](https://github.com/NarHakobyan/awesome-nest-boilerplate/)
- 🎯 The NestJS team for the amazing framework
- 💪 The TypeScript team for making JavaScript better
- 🔥 All the open-source contributors who made this possible

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

Made with ❤️ by developers, for developers

</div>
