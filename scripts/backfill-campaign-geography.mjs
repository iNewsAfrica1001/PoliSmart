import { PrismaClient } from "@prisma/client";
import { runCampaignGeographyBackfill, parseBackfillCliArgs } from "../server/services/campaignGeographyBackfill.js";

const required = ["MIGRATION_DATABASE_URL","POLISMART_NEON_PROJECT_ID","POLISMART_NEON_BRANCH_ID","POLISMART_NEON_BRANCH_NAME","POLISMART_DATABASE_NAME"];
const createRepository = (client, root = client) => ({
  async getIdentity(){const [row]=await client.$queryRaw`SELECT current_database() AS database,current_setting('neon.branch_id',true) AS "branchId"`;return row;},
  async readSource(){const levels=await client.geographicLevel.findMany();const areas=await client.geographicArea.findMany();const campaigns=await client.campaign.findMany({where:{id:{in:[...new Set(areas.map((a)=>a.campaignId))]}},select:{country:true}});return{levels,areas,country:campaigns.length===1?campaigns[0].country:null};},
  findEligibleActors(tenantId){return client.authUser.findMany({where:{emailVerifiedAt:{not:null},memberships:{some:{tenantId,role:"SUPER_ADMINISTRATOR",status:"ACTIVE"}}},select:{id:true}});},
  async readTarget(){return{levels:await client.masterGeographicLevel.findMany(),areas:await client.masterGeographicArea.findMany(),assignments:await client.campaignGeographicAssignment.findMany()};},
  acquireAdvisoryLock(){return client.$executeRaw`SELECT pg_advisory_xact_lock(739204021)`;},
  insertMasterLevels(data){return client.masterGeographicLevel.createMany({data});},
  insertMasterAreas(data){return client.masterGeographicArea.createMany({data});},
  insertAssignments(data){return client.campaignGeographicAssignment.createMany({data});},
  appendAudit(data){return client.securityAuditEvent.create({data});},
  transaction(callback){return root.$transaction((tx)=>callback(createRepository(tx,root)),{maxWait:10_000,timeout:120_000});},
});

let db;
try {
  const { mode, confirmation, productionSelector } = parseBackfillCliArgs(process.argv.slice(2));
  if (required.some((name) => !process.env[name])) throw Object.assign(new Error("Required controlled backfill environment is incomplete."), { code:"ENVIRONMENT_INCOMPLETE" });
  process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
  db = new PrismaClient();
  const result=await runCampaignGeographyBackfill({repository:createRepository(db),expectedIdentity:{projectId:process.env.POLISMART_NEON_PROJECT_ID,branchId:process.env.POLISMART_NEON_BRANCH_ID,branchName:process.env.POLISMART_NEON_BRANCH_NAME,database:process.env.POLISMART_DATABASE_NAME},mode,confirmation,productionSelector,productionDryRunAuthorization:process.env.POLISMART_PRODUCTION_BACKFILL_DRY_RUN_AUTHORIZATION,productionExecuteAuthorization:process.env.POLISMART_PRODUCTION_BACKFILL_EXECUTE_AUTHORIZATION,commit:process.env.POLISMART_AUTHORIZED_COMMIT,checkpointId:process.env.POLISMART_CHECKPOINT_ID||null});
  console.log(JSON.stringify(result,null,2));
} catch(error) { console.error(JSON.stringify({status:"FAILED",code:error.code||"BACKFILL_FAILED",errorType:error.constructor?.name||"Error"})); process.exitCode=1; }
finally { if(db) await db.$disconnect(); delete process.env.DATABASE_URL; delete process.env.MIGRATION_DATABASE_URL; }

