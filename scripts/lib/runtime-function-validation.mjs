export function validateRuntimeFunctions(rows, policy, {
  expectedOwner = "polismart_migrator",
  expectedSearchPath = "search_path=pg_catalog, public",
} = {}) {
  const bySignature = new Map(rows.map((row) => [row.signature, row]));
  const errors = [];
  for (const [signature, privileges] of Object.entries(policy)) {
    const row = bySignature.get(signature);
    if (!row?.exists) {
      errors.push(`${signature}:MISSING`);
      continue;
    }
    if (row.owner !== expectedOwner) errors.push(`${signature}:OWNER`);
    if (!row.security_definer) errors.push(`${signature}:SECURITY_DEFINER`);
    if (!Array.isArray(row.configuration) || !row.configuration.includes(expectedSearchPath))
      errors.push(`${signature}:SEARCH_PATH`);
    if (privileges.includes("EXECUTE") !== Boolean(row.runtime_execute))
      errors.push(`${signature}:RUNTIME_EXECUTE`);
    if (row.public_execute) errors.push(`${signature}:PUBLIC_EXECUTE`);
    if ((row.unexpected_execute_roles || []).length)
      errors.push(`${signature}:UNEXPECTED_EXECUTE_ROLE`);
  }
  for (const row of rows)
    if (!Object.hasOwn(policy, row.signature)) errors.push(`${row.signature}:UNEXPECTED_FUNCTION`);
  return errors;
}
