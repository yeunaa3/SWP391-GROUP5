export const screenFields = {
  "AUTH-01": ["Email", "Password", "Remember me", "Forgot-password link", "Sign-in button", "Registration link"],
  "AUTH-02": ["Account type", "Full name", "Email", "Phone number", "Password", "Confirm password", "Terms agreement", "Create-account button"],
  "AUTH-03": ["Email", "Send-reset-link button", "Confirmation message", "Back-to-login link"],
  "AUTH-04": ["New password", "Confirm new password", "Password requirements", "Reset-password button", "Token error message"],
  "ACC-01": ["Full name", "Email", "Phone number", "Current password", "New password", "Confirm new password", "Save changes"],
  "ACC-02": ["Unread filter", "Notification type", "Notification message", "Created time", "Read status", "Related-record link"],
  "ACC-03": ["Article title", "Category", "Saved time", "Premium label", "Open article", "Remove bookmark"],
  "PUB-01": ["Top navigation", "Search", "Featured article", "Latest article cards", "Premium labels", "Leaderboard ad placement", "Sidebar ad placement", "In-feed sponsored placement", "Most-viewed articles", "Pagination"],
  "PUB-02": ["Search keyword", "Category filter", "Published date", "Access type", "Sort order", "Result cards", "Search-results ad placement", "Pagination"],
  "PUB-03": ["Article title", "Category and source", "Published time", "Article body", "Premium preview", "Bookmark", "Leaderboard ad placement", "Inline article ad placement", "Sidebar ad placement", "Ad target URL", "Related articles"],
  "PUB-04": ["Premium preview", "Blurred content boundary", "Package benefits", "View packages button", "Sign in link", "Guest ad placement"],
  "PRE-01": ["Package name", "Price", "Duration", "Benefits", "Current-package label", "View-details button"],
  "PRE-02": ["Package name", "Price", "Duration", "Benefits", "Renewal terms", "Continue-to-checkout button"],
  "PRE-03": ["Selected package", "Billing summary", "Payment method", "Terms confirmation", "Pay button", "Cancel link"],
  "PRE-04": ["Payment status", "Transaction reference", "Amount", "Payment method", "Processed time", "Retry or continue action"],
  "PRE-05": ["Current package", "Subscription status", "Start date", "End date", "Renewal status", "Renew button", "Transaction-history link"],
  "PRE-06": ["Date filter", "Status filter", "Transaction reference", "Package", "Amount", "Payment status", "Receipt link"],
  "PRE-07": ["Receipt number", "Transaction reference", "Package", "Amount", "Payment method", "Payment time", "Download receipt"],
  "BUS-01": ["Partnership status", "Active contracts", "Active campaigns", "Impressions", "Clicks", "CTR", "Recent notices"],
  "BUS-02": ["Company name", "Tax code", "Industry", "Billing address", "Contact person", "Contact email", "Phone number", "Save button"],
  "BUS-03": ["Company summary", "Advertising objective", "Expected needs", "Contact person", "Document type", "Document upload", "Declaration", "Save draft", "Submit application"],
  "BUS-04": ["Application number", "Current status", "Submitted time", "Review reason", "Fields requiring revision", "Edit and resubmit button"],
  "BUS-05": ["Slot position", "Dimensions", "Base price", "B2B package", "Duration", "Impression quota", "Availability shortcut"],
  "BUS-06": ["Slot selector", "Month navigation", "Availability calendar", "Status legend", "Start date", "End date", "Continue button"],
  "BUS-07": ["Selected slot", "Start date", "End date", "B2B package", "Campaign requirement", "Estimated amount", "Save draft", "Submit booking"],
  "BUS-08": ["Booking status", "Slot and period", "Proposed amount", "Commercial terms", "Proposal expiry", "Revision request", "Accept proposal"],
  "BUS-09": ["Contract code", "Order summary", "Payable amount", "Payment method", "Payment deadline", "Pay button"],
  "BUS-10": ["Payment status", "Transaction reference", "Contract code", "Amount", "Processed time", "Retry or open-contract action"],
  "BUS-11": ["Status filter", "Contract code", "Slot", "Contract period", "Total amount", "Payment status", "Contract status"],
  "BUS-12": ["Contract summary", "Slot and period", "Commercial terms", "Payment status", "Linked campaigns", "Invoice information", "Download invoice", "Create campaign"],
  "BUS-13": ["Search and filters", "Campaign code", "Campaign name", "Contract", "Schedule", "Review status", "Delivery status", "Create campaign"],
  "BUS-14": ["Campaign name", "Active contract", "Start time", "End time", "Target URL", "Description", "Save draft", "Continue button"],
  "BUS-15": ["Creative file", "Creative preview", "Creative type", "Dimensions", "Category", "Tags", "Geographic area", "Device type", "Continue button"],
  "BUS-16": ["Campaign summary", "Contract check", "Schedule check", "Target URL check", "Creative check", "Targeting check", "Edit links", "Submit for review"],
  "BUS-17": ["Campaign status", "Review reason", "Approved creative", "Slot and schedule", "Status timeline", "Edit and resubmit", "Request creative change"],
  "BUS-18": ["Campaign selector", "Date range", "Impressions", "Clicks", "CTR", "Quota progress", "Daily trend", "View daily report"],
  "BUS-19": ["Date filter", "Daily impressions", "Daily clicks", "Daily CTR", "Final totals", "Completion status", "Export report"],
  "ADM-01": ["Pending partnerships", "Pending bookings", "Pending campaigns", "Active campaigns", "Delivery alerts", "Payment alerts", "Recent activity"],
  "ADM-02": ["Search and filters", "Application number", "Company", "Submitted time", "Status", "Priority", "Open review"],
  "ADM-03": ["Company information", "Tax and contact information", "Application content", "Legal document preview", "Validation summary", "Decision", "Reason", "Submit decision"],
  "ADM-04": ["Search and filters", "Booking number", "Company", "Slot", "Requested period", "Estimated amount", "Status", "Open booking"],
  "ADM-05": ["Booking summary", "Availability calendar", "Conflict list", "Calculated price", "Commercial terms", "Proposal expiry", "Send proposal"],
  "ADM-06": ["Contract summary", "Requested revision", "Manager response", "Revision status", "Payment status", "Payment deadline", "Reminder action", "Close booking"],
  "ADM-07": ["Search and filters", "Campaign code", "Company", "Submitted time", "Campaign status", "Creative status", "Open review"],
  "ADM-08": ["Campaign and contract summary", "Schedule and slot", "Target URL", "Targeting summary", "Creative preview", "Technical checks", "Decision", "Reason", "Submit decision"],
  "ADM-09": ["Status filter", "Campaign", "Delivery status", "Impressions", "Clicks", "Quota progress", "Last delivery", "Operational alert"],
  "ADM-10": ["Company and campaign filters", "Date range", "Impressions", "Clicks", "CTR", "Delivery trend", "Campaign comparison", "Export report"],
  "CFG-01": ["Active users", "Active Premium packages", "Active ad slots", "Active B2B packages", "Failed jobs", "System warnings", "Recent administration activity"],
  "CFG-02": ["Search and filters", "User identity", "Email", "Role", "Company", "Account status", "Permissions", "Save changes"],
  "CFG-03": ["Package code", "Package name", "Price", "Duration days", "Benefits", "Status", "Display priority", "Save package"],
  "CFG-04": ["Slot code", "Slot name", "Position", "Width", "Height", "Base price", "Status", "Save slot"],
  "CFG-05": ["Package code", "Package name", "Price", "Duration days", "Impression quota", "Description", "Status", "Save package"],
  "CFG-06": ["Setting group", "Setting name", "Setting value", "Description", "Status", "Last updated by", "Save changes"],
};

const formScreens = new Set([
  "AUTH-03", "AUTH-04", "ACC-01", "PRE-03", "BUS-02", "BUS-03", "BUS-07", "BUS-14", "BUS-15",
  "ADM-03", "ADM-05", "ADM-06", "ADM-08", "CFG-02", "CFG-03", "CFG-04", "CFG-05", "CFG-06",
]);

const reportScreens = new Set(["BUS-01", "BUS-18", "BUS-19", "ADM-01", "ADM-09", "ADM-10", "CFG-01"]);

export function screenMode(screenId) {
  if (formScreens.has(screenId)) return "form";
  if (reportScreens.has(screenId)) return "report";
  return "list";
}

export function primaryAction(fields = []) {
  const action = [...fields].reverse().find((field) => /button|save|submit|create|continue|accept|send|export|download|open|action|link|renew|review/i.test(field));
  return (action || "Open details").replace(/ button| link| action/gi, "");
}
