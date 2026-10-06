export function normalizeVercelApiRequest(request) {
  const requestQuery = request.query || {};
  const routedPath = Array.isArray(requestQuery.path)
    ? requestQuery.path.join("/")
    : requestQuery.path;

  if (!routedPath) return;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(requestQuery)) {
    if (key === "path") continue;
    for (const item of Array.isArray(value) ? value : [value])
      if (item != null) query.append(key, String(item));
  }

  request.url = `/api/${routedPath}${query.size ? `?${query}` : ""}`;
  delete requestQuery.path;
}
