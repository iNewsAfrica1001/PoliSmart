import test from "node:test";
import assert from "node:assert/strict";
import { createCampaignRepository } from "../server/repositories/campaignRepository.js";
import { PERMISSIONS, ROLES } from "../server/config/authorization.js";
import { authorize, hasPermission } from "../server/services/authorization.js";

const campaigns = [
  { id: "campaign-a", tenantId: "org-a" },
  { id: "campaign-b", tenantId: "org-b" },
];
const repository = createCampaignRepository({
  campaign: {
    findMany: async ({ where }) => campaigns.filter((item) => item.tenantId === where.tenantId),
    findFirst: async ({ where }) =>
      campaigns.find((item) => item.id === where.id && item.tenantId === where.tenantId) ?? null,
    create: async ({ data }) => data,
  },
});

test("tenant repository never returns another organization's campaigns", async () => {
  assert.deepEqual(await repository.listForTenant("org-a"), [campaigns[0]]);
  assert.equal(await repository.findForTenant("org-a", "campaign-b"), null);
});

test("tenant id is server-controlled when creating records", async () => {
  const campaign = await repository.createForTenant("org-a", { name: "Demo", tenantId: "org-b" });
  assert.equal(campaign.tenantId, "org-a");
});

test("all requested roles are fail-closed and have an explicit policy", () => {
  for (const role of Object.values(ROLES))
    assert.equal(hasPermission({ role }, PERMISSIONS.PROFILE_READ_OWN), true);
  assert.equal(hasPermission({ role: "UNRECOGNIZED" }, PERMISSIONS.PROFILE_READ_OWN), false);
  const volunteer = { role: ROLES.VOLUNTEER, tenantId: "org-a" };
  assert.deepEqual(
    authorize({
      actor: volunteer,
      permission: PERMISSIONS.CAMPAIGN_READ,
      organizationId: "org-b",
      requireOrganizationMatch: true,
    }),
    { allowed: false, reason: "organization-mismatch" },
  );
});
