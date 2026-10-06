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
    if ((row.inherited_execute_roles || []).length)
      errors.push(`${signature}:INHERITED_EXECUTE_ROLE`);
  }
  for (const row of rows)
    if (!Object.hasOwn(policy, row.signature)) errors.push(`${row.signature}:UNEXPECTED_FUNCTION`);
  return errors;
}

export function validateProtectedGeographyTables(rows, expectedOwner = "polismart_migrator") {
  const required = new Set([
    "master_geographic_levels",
    "master_geographic_areas",
    "campaign_geographic_assignments",
  ]);
  const errors = [];
  for (const row of rows) {
    required.delete(row.table_name);
    if (row.owner !== expectedOwner) errors.push(`${row.table_name}:OWNER`);
    if (row.runtime_owner) errors.push(`${row.table_name}:RUNTIME_OWNER`);
    if (!row.select_privilege) errors.push(`${row.table_name}:SELECT`);
    for (const privilege of ["insert", "update", "delete", "truncate"])
      if (row[`${privilege}_privilege`]) errors.push(`${row.table_name}:${privilege.toUpperCase()}`);
  }
  for (const table of required) errors.push(`${table}:MISSING`);
  return errors;
}
