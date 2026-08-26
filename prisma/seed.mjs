import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PERMISSION_POLICY } from "../server/config/authorization.js";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "DemoOnly-Change-2026";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const organization = await prisma.organization.upsert({
    where: { slug: "sentinel-demo-campaign" },
    update: { name: "Sentinel Demo Campaign", country: "Kisiwa", isDemo: true },
    create: {
      name: "Sentinel Demo Campaign",
      slug: "sentinel-demo-campaign",
      country: "Kisiwa",
      isDemo: true,
    },
  });
  const campaign = await prisma.campaign.upsert({
    where: { tenantId_slug: { tenantId: organization.id, slug: "kisiwa-future-demo" } },
    update: { isDemo: true, country: "Kisiwa", electionType: "National General Election [DEMO]" },
    create: {
      tenantId: organization.id,
      name: "Kisiwa Future Campaign [DEMO]",
      slug: "kisiwa-future-demo",
      country: "Kisiwa",
      electionType: "National General Election [DEMO]",
      status: "ACTIVE",
      isDemo: true,
    },
  });
  const user = await prisma.authUser.upsert({
    where: { email: "admin@sentinel-demo.example.invalid" },
    update: { displayName: "Sentinel Demo Administrator", passwordHash },
    create: {
      email: "admin@sentinel-demo.example.invalid",
      displayName: "Sentinel Demo Administrator",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: organization.id, userId: user.id } },
    update: { role: "CAMPAIGN_ADMINISTRATOR", status: "ACTIVE" },
    create: { tenantId: organization.id, userId: user.id, role: "CAMPAIGN_ADMINISTRATOR" },
  });
  for (const [orderIndex, name] of [
    "Country",
    "Region / State / Province",
    "District",
    "Constituency",
    "Ward",
  ].entries())
    await prisma.geographicLevel.upsert({
      where: { tenantId_name: { tenantId: organization.id, name } },
      update: { orderIndex },
      create: { tenantId: organization.id, name, orderIndex },
    });
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key: description },
      update: {},
      create: {
        key: description,
        description: `${key.replaceAll("_", " ").toLowerCase()} permission`,
      },
    });
  }
  const permissions = await prisma.permission.findMany();
  for (const [role, keys] of Object.entries(ROLE_PERMISSION_POLICY))
    for (const permission of permissions.filter((item) => keys.includes(item.key)))
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: permission.id } },
        update: {},
        create: { role, permissionId: permission.id },
      });
  console.log(
    JSON.stringify(
      {
        demoData: true,
        organization: organization.name,
        country: organization.country,
        campaign: campaign.name,
        account: user.email,
        warning: "Fictional demonstration data only. Change the demo password before shared use.",
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());
