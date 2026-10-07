# Toolbar and reader settings — 2026-10-06

- Public navigation: compact logo, three primary destinations, icon search, VI/EN selector, theme toggle and workspace/sign-in action. Topic navigation remains a separate scrollable row. Removed duplicate registration action.
- Workspace toolbar: current-screen breadcrumb and account dropdown. Removed nonfunctional record search, help and hardcoded notification count. Account links and logout retain existing behavior.
- Preferences: browser-local language and reader-font selection with preview and reset. Fonts: Segoe UI, Arial, Georgia and Times New Roman, with system fallbacks. Applies to editorial text rather than administrative navigation.
- Language currently covers shared navigation, login, authentication shell, quick search and preferences/support dialogs. Business forms, reports and other page-specific content still require translation. Imported articles retain their source language.
- Support corner panel is a clearly labeled placeholder with working shortcuts. Send is disabled; no AI service or message delivery is claimed.
- Frontend production build verified. No database schema changes.

## Follow-up fixes

- Search and all dialogs now render via a body portal, outside the sticky blurred header. This fixes fixed-position dialogs being clipped by the header's containing block. Verified search overlay visually on localhost.
- Removed header language selectors on public, workspace and authentication layouts: language is configured in reader settings only.
- Added exact Vietnamese UI dictionary for workspace navigation, screen titles, common form fields, table headings, actions and sample descriptions. Business partnership status page verified in Vietnamese. Imported content and company/campaign names are not translated. Other bespoke pages still need complete English localization.
- Speech now waits for delayed voice loading, allows browser language-based voice selection when no explicit Vietnamese voice is enumerated, and shows startup/error messages rather than a disabled button. In-app browser did not expose a Vietnamese voice: actual Vietnamese audio cannot be certified here. Independent server TTS remains unimplemented; use a browser/device with a Vietnamese voice.
