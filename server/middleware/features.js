export function requireFeatureEnabled(feature, enabled) {
  return (_request, response, next) => {
    if (enabled === true) return next();
    return response.status(404).json({
      code: "FEATURE_DISABLED",
      feature,
      message: `${feature[0].toUpperCase()}${feature.slice(1)} is not available.`,
    });
  };
}
