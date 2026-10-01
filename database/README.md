# Database workspace

MySQL is the approved DBMS. The final physical schema is still being reviewed.

- Runtime schema migrations belong in `backend/src/main/resources/db/migration` and are managed by Flyway.
- Put development-only reference data in `seeds` until it is converted into an approved repeatable migration.
- Keep the approved ERD, mapping notes, and reviewed SQL drafts in `documentation`.
- Do not place passwords, production exports, or uploaded media in this repository.

Use Flyway names such as `V2__create_identity_tables.sql` and `V3__create_subscription_tables.sql`. Never modify a migration after it has been applied to a shared database.

