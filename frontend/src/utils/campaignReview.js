export function reviewQueuePage(rows, { query = "", order = "oldest", page = 0, size = 10 } = {}) {
  const term = query.trim().toLocaleLowerCase("vi");
  const filtered = rows.filter(row => [row.company_name, row.campaign_code, row.snapshot?.campaign?.campaign_name]
    .some(value => String(value || "").toLocaleLowerCase("vi").includes(term)));
  filtered.sort((a, b) => {
    const byTime = (Date.parse(a.submitted_at) || 0) - (Date.parse(b.submitted_at) || 0);
    const byId = Number(a.submission_id) - Number(b.submission_id);
    return (order === "newest" ? -1 : 1) * (byTime || byId);
  });
  const lastPage = Math.max(0, Math.ceil(filtered.length / size) - 1);
  const current = Math.max(0, Math.min(page, lastPage));
  return { items: filtered.slice(current * size, (current + 1) * size), total: filtered.length, page: current, hasNext: current < lastPage };
}
