import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // A demo collector with a couple of pieces.
  const collector = await prisma.user.upsert({
    where: { email: "collector@horoprive.example" },
    update: {},
    create: {
      email: "collector@horoprive.example",
      name: "Demo Collector",
      role: "CLIENT",
      passwordHash: password,
      client: { create: { country: "United Kingdom", timezone: "GMT" } },
    },
    include: { client: true },
  });

  if (collector.client) {
    const count = await prisma.watch.count({ where: { clientId: collector.client.id } });
    if (count === 0) {
      await prisma.watch.createMany({
        data: [
          { clientId: collector.client.id, brand: "Rolex", model: "Submariner Date", reference: "126610LN", year: 2024, purchasePrice: 12500, condition: "Unworn", boxPapers: "Full set", location: "United Kingdom" },
          { clientId: collector.client.id, brand: "Omega", model: "Speedmaster", reference: "310.30.42", year: 2023, purchasePrice: 6500, condition: "Unworn", boxPapers: "Full set", location: "United Kingdom" },
        ],
      });
    }

    const reqCount = await prisma.request.count({ where: { clientId: collector.client.id } });
    if (reqCount === 0) {
      await prisma.request.create({
        data: {
          clientId: collector.client.id,
          kind: "RARE_PIECE",
          brand: "Patek Philippe",
          model: "Nautilus 5711/1A",
          deliveryCountry: "United Kingdom",
          notes: "Blue dial, full set, prefer 2021+.",
          status: "SEARCHING",
        },
      });
    }
  }

  // A consultant (staff) account.
  await prisma.user.upsert({
    where: { email: "consultant@horoprive.example" },
    update: {},
    create: {
      email: "consultant@horoprive.example",
      name: "Demo Consultant",
      role: "CONSULTANT",
      passwordHash: password,
    },
  });

  console.log("Seeded. Login: collector@horoprive.example / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
