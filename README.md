# Premium News and Advertising Management System

Group 5 SWP391 project for Premium news subscriptions and advertising partnership management.

## Agreed architecture

```text
Browser -> React SPA -> REST API -> Spring Boot -> Spring Data JPA -> MySQL
                                      |-> Payment Gateway
                                      |-> Email Service
                                      |-> Cloud Storage / CDN
```

The frontend and backend are separate applications. React never connects directly to MySQL. Spring Boot owns authentication, authorization, validation, business rules, transactions, integrations, and database access.

## Repository layout

```text
frontend/             React + Vite single-page application
backend/              Java Spring Boot REST API
database/             Database notes, reviewed SQL, and seed references
docs/                 SRS/SDS and architecture notes
compose.yaml          Local MySQL service
```

## Required software

- JDK 21
- Maven 3.9+
- Node.js 20.19+ or 22.12+
- pnpm 10+ (recommended) or npm
- Docker Desktop (recommended for local MySQL)

Run `powershell -ExecutionPolicy Bypass -File scripts/check-environment.ps1` to verify the machine. This computer can reuse the JDK and Maven bundled with IntelliJ IDEA.

## First local setup

1. Copy `.env.example` to `.env` and change the local passwords.
2. Copy `backend/.env.example` to `backend/.env` if your IDE loads environment files. Otherwise add the same values to the IDE run configuration.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Start MySQL: `docker compose up -d mysql`.
5. Run `powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1`.
6. In another terminal, run `powershell -ExecutionPolicy Bypass -File scripts/run-frontend.ps1`.

Open `http://localhost:5173`. The REST API runs at `http://localhost:8080`; MySQL runs at `localhost:3306/premium_news_ad_local`.

## Team rules

- Local and deployed environments use the same source code and Flyway migrations.
- URLs, credentials, and keys are supplied through environment variables.
- Never put database passwords or secrets in React. Every `VITE_*` value is visible in the browser.
- Schema changes belong in `backend/src/main/resources/db/migration`; do not let Hibernate create production tables.
- Controllers call Services; Services call Repositories. Controllers do not access repositories directly.
- JPA entities remain internal. REST APIs exchange request/response DTOs.

## Starter endpoints

- `GET /api/health` verifies that the backend is running.
- `GET /actuator/health` exposes Spring Boot health status.

The starter does not create final business tables yet. Add the approved schema as a new Flyway migration after the ERD/database review.
