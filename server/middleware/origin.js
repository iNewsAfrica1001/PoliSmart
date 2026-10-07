function normalizeTrustedOrigin(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (["http:", "https:"].includes(url.protocol)) return url.origin;
    if (["capacitor:", "ionic:"].includes(url.protocol) && url.hostname === "localhost" && !url.port)
      return `${url.protocol}//localhost`;
  } catch {
    // Invalid and opaque origins fail closed below.
  }
  return null;
}

export function trustedBrowserOrigin(origins) {
  const trusted = new Set(origins.map(normalizeTrustedOrigin).filter(Boolean));
  return (request, _response, next) => {
    const supplied = request.get("origin");
    // Non-browser clients may omit Origin; authenticated routes retain their normal authorization.
    if (!supplied) return next();
    const origin = normalizeTrustedOrigin(supplied);
    if (!origin || !trusted.has(origin))
      return next(Object.assign(new Error("Request origin is not authorized."), { status: 403 }));
    next();
  };
}
