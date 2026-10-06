import { PrismaClient } from "@prisma/client";

const sql = (client, fragments, ...values) => client.$queryRawUnsafe(fragments, ...values);

function requireFixture(fixture, names) {
  for (const name of names)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(fixture[name] || ""))
      throw new Error(`Isolated rehearsal fixture is missing ${name}.`);
}

export async function runCampaignGeographyPostgresBehavior({
  behavior,
  migratorUrl,
  runtimeUrl,
  fixture,
}) {
  requireFixture(fixture, ["tenantId", "campaignId", "authorizedActorId"]);
  const migrator = new PrismaClient({ datasourceUrl: migratorUrl });
  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const invoke = (functionName, actorId, ids) =>
    sql(
      runtime,
      `SELECT public.${functionName}($1::uuid,$2::uuid,$3::uuid,$4::uuid[]) AS result`,
      fixture.tenantId,
      fixture.campaignId,
      actorId,
      ids,
    );
  try {
    if (behavior === "PUBLIC EXECUTE denial") {
      const [row] = await sql(
        migrator,
        `SELECT EXISTS (
           SELECT 1 FROM pg_proc p,
             LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
          WHERE p.oid = to_regprocedure('public.campaign_geography_assign(uuid,uuid,uuid,uuid[])')
            AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
         ) AS allowed`,
      );
      if (row.allowed) throw new Error("PUBLIC unexpectedly has function EXECUTE.");
      return;
    }
    if (behavior === "runtime direct table-write denial") {
      let denied = false;
      try {
        await runtime.$transaction(async (tx) => {
          await tx.campaignGeographicAssignment.deleteMany({ where: { campaignId: fixture.campaignId } });
          throw new Error("ROLLBACK_UNEXPECTED_WRITE");
        });
      } catch (error) {
        denied = !String(error?.message).includes("ROLLBACK_UNEXPECTED_WRITE");
      }
      if (!denied) throw new Error("Runtime direct table mutation unexpectedly succeeded.");
      return;
    }
    if (behavior === "controlled runtime function execution") {
      requireFixture(fixture, ["countryAreaId"]);
      await invoke("campaign_geography_assign", fixture.authorizedActorId, [fixture.countryAreaId]);
      return;
    }
    // The remaining cases use a separately reviewed fixture action. Keeping the dispatch explicit
    // makes every rehearsal behavior independently reportable and prevents arbitrary SQL input.
    const action = fixture.actions?.[behavior];
    if (!action || !["assign", "deactivate", "expect-rejection", "verify-state"].includes(action.type))
      throw new Error(`Isolated rehearsal fixture does not define ${behavior}.`);
    if (!(action.areaIds || []).every((id) => /^[0-9a-f-]{36}$/iu.test(id)))
      throw new Error(`${behavior} contains an invalid fixture area ID.`);
    const actorId = action.actorId || fixture.authorizedActorId;
    const fn = action.function === "deactivate" ? "campaign_geography_deactivate" : "campaign_geography_assign";
    let result;
    let rejected = false;
    try {
      result =
        behavior === "concurrent operations"
          ? (await Promise.all([
              invoke(fn, actorId, action.areaIds || []),
              invoke(fn, actorId, action.areaIds || []),
            ]))[0]
          : await invoke(fn, actorId, action.areaIds || []);
    } catch {
      rejected = true;
    }
    if (action.type === "expect-rejection" && !rejected)
      throw new Error(`${behavior} unexpectedly succeeded.`);
    if (action.type !== "expect-rejection" && rejected)
      throw new Error(`${behavior} unexpectedly failed.`);
    if (action.expectedResult)
      for (const [key, value] of Object.entries(action.expectedResult))
        if (result?.[0]?.result?.[key] !== value)
          throw new Error(`${behavior} result mismatch for ${key}.`);
  } finally {
    await Promise.allSettled([runtime.$disconnect(), migrator.$disconnect()]);
  }
}
