import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { insertSampleProducts } from "../src/lib/sampleData";
import { insertStarterCatalog } from "../src/lib/catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo database...");

  // Pre-configure the store so the demo skips the setup wizard.
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: { setupComplete: true },
    create: {
      id: "singleton",
      businessName: "FadaTech",
      tagline: "Phone Accessories",
      currencySymbol: "₦",
      accentColor: "indigo",
      setupComplete: true,
    },
  });

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { id: "admin-id" },
    update: {},
    create: {
      id: "admin-id",
      name: "Admin",
      username: "admin",
      password: adminPassword,
      role: "admin",
    },
  });

  // Sales reps — each with a unique username (their first name, lowercased)
  const repPassword = await bcrypt.hash("my123", 12);
  const repNames = ["Favour", "Aisha", "Musa", "Sandra", "Chinedu", "Deborah"];
  for (const name of repNames) {
    const username = name.toLowerCase();
    await prisma.user.upsert({
      where: { id: `rep-${username}` },
      update: { username },
      create: {
        id: `rep-${username}`,
        name,
        username,
        password: repPassword,
        role: "rep",
      },
    });
  }

  // Starter categories & brands, then the sample catalogue
  await insertStarterCatalog(prisma);
  await insertSampleProducts(prisma);

  console.log("Seed complete!");
  console.log("---");
  console.log("Admin login:   admin / admin123");
  console.log("Rep logins:    favour, aisha, musa, sandra, chinedu, deborah");
  console.log("Rep password:  my123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
