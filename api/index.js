import app from "../server.js";

export default function handler(request, response) {
  const routedPath = Array.isArray(request.query?.path)
    ? request.query.path.join("/")
    : request.query?.path;
  if (routedPath) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query || {})) {
      if (key === "path") continue;
      for (const item of Array.isArray(value) ? value : [value])
        if (item != null) query.append(key, String(item));
    }
    request.url = `/api/${routedPath}${query.size ? `?${query}` : ""}`;
  }
  return app(request, response);
}
