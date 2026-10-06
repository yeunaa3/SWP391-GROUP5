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

### Local MySQL without Docker

If Docker Desktop is not installed, install **MySQL Community Server 8.4 LTS** and optionally MySQL Workbench. During installation, keep TCP port `3306`, enable the Windows service, and remember the root password. Then open MySQL Shell or Workbench and run:

```sql
CREATE DATABASE premium_news_ad_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'premium_app'@'localhost' IDENTIFIED BY 'change-me-local';
GRANT ALL PRIVILEGES ON premium_news_ad_local.* TO 'premium_app'@'localhost';
FLUSH PRIVILEGES;
```

Copy `backend/.env.example` to `backend/.env`. Its default database name, user, and password already match the commands above. Starting the backend runs the Flyway migrations automatically; do not manually import both the SQL file and Flyway migrations into the same empty database.

## Team rules

- Local and deployed environments use the same source code and Flyway migrations.
- URLs, credentials, and keys are supplied through environment variables.
- Never put database passwords or secrets in React. Every `VITE_*` value is visible in the browser.
- Schema changes belong in `backend/src/main/resources/db/migration`; do not let Hibernate create production tables.
- Controllers call Services; Services call Repositories. Controllers do not access repositories directly.
- JPA entities remain internal. REST APIs exchange request/response DTOs.

## Implemented foundation endpoints

- `GET /api/health` verifies that the backend is running.
- `GET /actuator/health` exposes Spring Boot health status.
- `GET /api/auth/csrf` initializes CSRF protection for the React client.
- `POST /api/auth/register` creates a Reader or Business account.
- `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` use a server-side session.
- `GET /api/articles` supports the public feed and keyword/category search.
- `GET /api/articles/{slug}` returns article detail and Premium preview metadata.
- `GET /api/subscription-packages` returns active Premium offers.
- `GET /api/advertising/offers` and `GET /api/advertising/slots` return the advertising catalogue.

Flyway creates the reviewed MySQL physical schema through `V2__create_application_schema.sql`, seeds roles/settings through `V3__seed_reference_data.sql`, and adds local demonstration content through `V4__seed_local_demo_content.sql`. The frontend has all 53 SRS routes. Public news, search, article/paywall, Login, Registration, Premium packages and the advertising catalogue have dedicated pages. Other protected routes render the fields, filters, actions, metrics and workflow components defined by their SRS screen specification.

## Local demonstration accounts

The `local` profile creates `reader.demo`, `business.demo`, `manager.demo`, and `admin.demo` with the roles Reader, Business, Ad Manager, and Administrator. Their default local password is `Demo@12345`; override it with `DEMO_PASSWORD` and never use the default in deployment.

If Spring Boot is unavailable, public content pages fall back to bundled demonstration data and show a yellow notice. Authentication and protected workspaces still require Spring Boot and MySQL.

## Planning and review

## News import and advertising examples

The local profile imports public RSS headlines and introductions from VnExpress and Tuổi Trẻ at startup and every 15 minutes. `NEWS_IMPORT_ENABLED=false` disables imports. Source names, original URLs, photos from RSS and publication dates are kept in MySQL. Administrator can also run an import from System Settings. Full article text is read on the publisher website; RSS items are never reclassified as Premium.

Local startup creates three fictitious advertising campaigns with approved banners, paid sample contracts and synthetic seven-day metrics. Business demo and Ad Manager pages display the campaign records from MySQL. Public banners link to an internal sample landing page. Live impression/click analytics remains unfinished.

See `docs/reviews/NEWS_AND_AD_SAMPLE_DATA.md` for implementation details and limitations.

- `docs/planning/CODING_PLAN.md`: dependency graph, eight branched Main Flow graphs, ownership and implementation order.
- `docs/reviews/SRS_SDS_GAP_REPORT.md`: all identified SRS/SDS/database gaps and the reason for each source change.
