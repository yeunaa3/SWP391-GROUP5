# Local Web Implementation Report

Date: 2026-10-06

## Visual polish and motion update

- Added scroll-triggered entrance effects for news cards, advertising, forms and workspace panels using native IntersectionObserver; no animation library required.
- Added hover transitions for editorial images, navigation, cards, buttons and sidebar links, plus an on-hover banner light sweep.
- Refined paper colors, editorial card borders, article typography, source attribution, breadcrumbs and related-news rail.
- Added a sticky public header, live-news indicator, scroll progress line and smooth back-to-top button.
- Replaced blocking article notices with inline status feedback and handled clipboard failures.
- Added visible keyboard focus and reduced-motion support; animations do not run for users with reduced motion enabled.
- Checked article rendering and scrolling in the browser; source panel remained visible and the progress line/back-to-top button appeared correctly.
- Frontend build verified after changes. This update does not complete the pending bookmark or advertising event workflows.

## Completed

- Replaced the SQL Server-formatted desktop database script with the MySQL 8.4 Flyway schema.
- Preserved the React SPA to REST API to Spring Boot to MySQL architecture.
- Added database-backed APIs for article discovery/detail, Premium packages, advertising packages, and advertising slots.
- Added local seed data for articles, categories, tags, Premium packages, B2B packages, and advertising slots.
- Added local accounts for Reader, Business, Ad Manager, and Administrator.
- Implemented dedicated Home, Search, Article/Paywall, Premium Package, and Advertising Price List pages.
- Added the SRS field, filter, action, metric, upload, and status components for all 53 screen IDs.
- Added role-specific navigation and distinct list, form, and reporting page layouts.
- Added public fallback data so the visual website remains reviewable while the backend is stopped.
- Backend Maven build succeeded and all 4 tests passed.
- Frontend production build succeeded.
- Home and Premium Article pages were visually checked in the local browser.
- Extracted all 53 embedded SRS UI references into `docs/requirements/ui-reference`.
- Reworked public, authentication, Business, Ad Manager, and Administrator shells to follow the SRS visual language: black utility/sidebar areas, editorial serif headings, red actions, warm neutral canvas, and cream advertising placements.
- Rebuilt the Home, Search, Article, and authentication pages around the actual SRS layouts instead of the earlier generic component shell.
- Prevented the public article API from returning full Premium content unless the current user has an active subscription.

## Requires local infrastructure

- Authentication and protected workspaces require Spring Boot and MySQL.
- MySQL 8.4 is now installed and connected. Flyway V1–V5 has been applied successfully; local backend health and database-backed endpoints have been checked.
- Final editorial photos, advertising media, company legal documents, and brand assets are not embedded as production assets. Add project-owned files or Cloud Storage/CDN URLs when available.

## Screen behavior not connected to complete services yet

The layouts and controls exist, but these actions still use prototype behavior or sample records:

- Profile update, notification state, and bookmark persistence.
- Premium checkout, payment callback, subscription activation, history, and receipts.
- Partnership submission, document storage, revision, and Ad Manager decision.
- Slot calendar, booking conflict lock, proposal negotiation, contract payment, and invoice.
- Campaign editing, creative upload/versioning, targeting, submission, review, and scheduling.
- Ad selection, impression/click validation, event aggregation, and report export.
- Administration CRUD for users, roles, packages, slots, pricing, and settings.

## RSS and advertising update verified on 2026-10-06

- Public RSS import is a backend feature, enabled locally at startup and every 15 minutes, with a protected Administrator manual-import endpoint in System Settings.
- Latest checked dataset: 58 VnExpress articles and 39 Tuổi Trẻ articles, plus the four original demonstration articles. Counts grow as feeds change.
- Sources, publication dates, RSS image URLs and introductions are persisted; source URLs are not duplicated after repeat imports.
- Public home, search and detail screens show source credits and original article links. Article bodies are not scraped.
- Three fictitious campaigns, paid sample contracts, approved banner creatives and 21 synthetic daily metric rows are stored in existing tables.
- Campaign-data API verifies company ownership for Business and allows Ad Manager/Administrator access. Business is denied Administrator import with HTTP 403.
- Administrator manual import processed 100 feed entries with zero feed errors; duplicate-source check returned zero.
- Frontend production build succeeds; seven backend tests pass. Public pages and banner rendering were checked in the browser.
- Live click/impression collection and editing workflows remain unfinished; synthetic metrics are labeled as sample data.
- Full implementation notes: `NEWS_AND_AD_SAMPLE_DATA.md`.

## External adapters intentionally unfinished

- Payment Gateway sandbox and webhook signature verification.
- Email provider, templates, retry, and delivery tracking.
- Cloud Storage/CDN upload, file validation, and orphan cleanup.

## Recommended next coding order

1. Start MySQL 8.4 and run all Flyway migrations once.
2. Implement BF-03 and BF-04 partnership submission and review.
3. Implement BF-01 Premium checkout using a fake payment adapter.
4. Implement BF-05 booking and contract locking.
5. Implement BF-06 and BF-07 campaign, creative, and review.
6. Implement BF-08 delivery events and performance reporting.
