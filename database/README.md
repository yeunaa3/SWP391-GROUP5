# Database workspace

MySQL 8.4 is the approved DBMS. The first reviewable physical schema is now versioned with the source code.

- Runtime schema migrations belong in `backend/src/main/resources/db/migration` and are managed by Flyway.
- Put development-only reference data in `seeds` until it is converted into an approved repeatable migration.
- Keep the approved ERD, mapping notes, and reviewed SQL drafts in `documentation`.
- Do not place passwords, production exports, or uploaded media in this repository.

Current migrations:

- `V1__baseline.sql`: repository baseline marker.
- `V2__create_application_schema.sql`: MySQL application schema.
- `V3__seed_reference_data.sql`: required roles and approved default settings.
- `V4__seed_local_demo_content.sql`: local articles, categories, packages, and advertising placements.

`PremiumNewsAdDB.mysql.sql` and the desktop file `MySQL DB.txt` are standalone copies of the reviewed MySQL V2 schema. The conceptual ERD may omit technical tables for readability; the physical schema includes junction tables plus `company_documents`, `payment_webhook_events`, and `ad_events` to satisfy the SRS.

Use Flyway names such as `V2__create_identity_tables.sql` and `V3__create_subscription_tables.sql`. Never modify a migration after it has been applied to a shared database.

