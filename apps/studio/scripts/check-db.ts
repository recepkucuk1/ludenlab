import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

async function main() {
  const subs = await p.subscription.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { therapist: { select: { email: true, planType: true, credits: true } } },
  });
  const webhooks = await p.webhookDelivery.findMany({ take: 5, orderBy: { receivedAt: "desc" } });
  console.log("SUBSCRIPTIONS:", JSON.stringify(subs, null, 2));
  console.log("WEBHOOK DELIVERIES:", JSON.stringify(webhooks, null, 2));
  await p.$disconnect();
}

main();
