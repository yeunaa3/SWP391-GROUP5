# Project Structure

The repository follows the revised SDS architecture: React frontend, Spring Boot REST API, and MySQL.

## Request path

1. React sends an HTTP/HTTPS request containing JSON.
2. Spring Security authenticates the caller and checks role permissions.
3. A REST Controller validates the request shape and calls a Service.
4. The Service enforces business rules and transaction boundaries.
5. A Spring Data JPA Repository reads or writes MySQL.
6. The Service maps the result to a response DTO.
7. The Controller returns JSON for React to render.

## Frontend boundaries

- `pages`: complete screens from the SRS Screen Inventory.
- `components`: reusable UI elements.
- `layouts`: public, Business, Ad Manager, and Administrator shells.
- `routes`: public/protected routes and role checks.
- `services`: reusable Spring Boot API calls.
- `hooks`: reusable React behavior.
- `store`: shared client-side state.
- `utils`: formatting and client-side validation helpers.
- `assets`: static application assets.

## Backend boundaries

- `controller`: HTTP input/output only.
- `service`: use cases, state transitions, and transactions.
- `repository`: Spring Data JPA persistence.
- `entity`: models mapped to MySQL tables.
- `dto`: validated API request/response contracts.
- `security`: authentication and role authorization.
- `integration`: Payment, Email, and Cloud Storage/CDN adapters.
- `scheduler`: background jobs.
- `exception`: centralized API error handling.
- `config`: CORS and technical configuration.
- `util`: small technical helpers only.

## Feature groups

- Public news and Premium access
- Authentication and reader account
- Business partnership
- Booking, contract, and payment
- Advertising campaign, creative, and targeting
- Ad Manager review and monitoring
- Administration and configuration

## Authentication decision

The browser uses a Spring Security server-side session. The session identifier is stored only in an HttpOnly cookie; state-changing requests also send the CSRF token issued by `GET /api/auth/csrf`. React does not store an access token in localStorage.

Reader and Business account registration share the same endpoint. A Business account receives the BUSINESS role but does not create a Company automatically. Company identity and legal documents are created and reviewed later through BF-03/BF-04.

