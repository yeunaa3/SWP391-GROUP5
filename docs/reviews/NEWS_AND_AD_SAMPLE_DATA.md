# RSS news and advertising demo data

## Working features

- Fixed public RSS feeds from VnExpress and Tuổi Trẻ are read at startup and every 15 minutes when `NEWS_IMPORT_ENABLED=true` (enabled by default for the local profile).
- Each feed contributes at most 20 items per run. Titles, RSS introductions, remote RSS image URLs, publication dates, categories and source links are stored in MySQL.
- A SHA-256-derived unique slug prevents repeated imports of the same URL. The importer updates existing introductions without duplicating articles.
- One unavailable feed does not stop other feeds or the website. Previously imported articles remain available offline.
- Administrator can invoke `POST /api/admin/news-import` through System Settings. The endpoint requires the Administrator role and CSRF token.
- No article-body crawling is performed. RSS articles remain free, with attribution and a button to read the full source article. Existing Premium demonstration articles stay separate.
- Source metadata is added through V5; previously applied migrations remain unchanged.

## Advertising seed

- Local startup creates an approved fictitious company, three paid active sample contracts, three active campaigns, three approved creatives and seven days of synthetic metrics per creative.
- Brands: NovaLearn, GreenFarm and CloudDesk. These names, banners and numbers are fictitious; sample banner links point to an internal demo landing page.
- `GET /api/advertising/banners?position=HOME_HERO` (or ARTICLE_TOP, ARTICLE_SIDEBAR) loads creatives from MySQL after checking campaign, contract, payment, slot and schedule eligibility.
- Business sees its own records; Ad Manager and Administrator can inspect records through the protected campaign-data endpoint. Business demo is associated with the sample company.
- Sample banners are self-contained local SVG assets; internet is not needed to render them.

## Limitations and next work

- News photos depend on publisher RSS image URLs. Unavailable photos are hidden gracefully. Imported bodies are RSS introductions only.
- Displayed advertisement metrics are seeded sample values, not live measurement. Impression/click event validation, quotas, detailed targeting and rotation still belong to BF-08 implementation.
- Existing generic workspace forms are still prototypes. Campaign cards show database records; editing/review/payment workflows need their dedicated services.
- Re-running seed preserves existing campaign records and metrics. Expired demo campaigns are not automatically extended.
- Production importing requires the team to verify the scope of permission for the selected sources. Set `NEWS_IMPORT_ENABLED=false` to disable network imports.

References: https://vnexpress.net/rss ; https://tuoitre.vn/rss.htm
