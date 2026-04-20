import { hashSync } from "bcryptjs";
import { db } from "../src/lib/db";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0); // random hour 8-20
  return d;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Admin User ─────────────────────────────────────────────────────────
  const adminPassword = hashSync("admin123", 10);
  const admin = await db.user.upsert({
    where: { email: "admin@wealthtracker.com" },
    update: {},
    create: {
      email: "admin@wealthtracker.com",
      username: "Admin",
      password: adminPassword,
      role: "admin",
      plan: "pro",
      status: "active",
      maxCategories: 50,
      maxSavings: 20,
      locale: "id",
      currency: "IDR",
    },
  });
  console.log(`✅ Admin user created: ${admin.email} (${admin.id})`);

  // ─── Demo User ─────────────────────────────────────────────────────────
  const demoPassword = hashSync("demo123", 10);
  const demo = await db.user.upsert({
    where: { email: "demo@wealthtracker.com" },
    update: {},
    create: {
      email: "demo@wealthtracker.com",
      username: "Demo User",
      password: demoPassword,
      role: "user",
      plan: "basic",
      status: "active",
      maxCategories: 10,
      maxSavings: 3,
      locale: "id",
      currency: "IDR",
    },
  });
  console.log(`✅ Demo user created: ${demo.email} (${demo.id})\n`);

  // ─── Categories for Demo User ──────────────────────────────────────────
  const categoryData = [
    // Income categories
    { name: "Gaji", type: "income", color: "#10b981", icon: "Wallet" },
    { name: "Freelance", type: "income", color: "#03DAC6", icon: "Laptop" },
    { name: "Bonus", type: "income", color: "#BB86FC", icon: "Gift" },
    { name: "Investasi", type: "income", color: "#64B5F6", icon: "TrendingUp" },
    // Expense categories
    { name: "Makanan", type: "expense", color: "#ef4444", icon: "UtensilsCrossed" },
    { name: "Transportasi", type: "expense", color: "#F9A825", icon: "Car" },
    { name: "Belanja", type: "expense", color: "#CF6679", icon: "ShoppingBag" },
    { name: "Hiburan", type: "expense", color: "#BA68C8", icon: "Gamepad2" },
    { name: "Tagihan", type: "expense", color: "#7986CB", icon: "Receipt" },
    { name: "Kesehatan", type: "expense", color: "#4DB6AC", icon: "Heart" },
  ];

  const createdCategories: Record<string, string> = {};
  let categoryCount = 0;

  for (const cat of categoryData) {
    const result = await db.category.upsert({
      where: {
        name_userId_type: {
          name: cat.name,
          userId: demo.id,
          type: cat.type,
        },
      },
      update: {},
      create: {
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        userId: demo.id,
      },
    });
    createdCategories[cat.name] = result.id;
    categoryCount++;
  }
  console.log(`✅ ${categoryCount} categories created for demo user\n`);

  // ─── Transactions for Demo User ────────────────────────────────────────
  const transactionData = [
    // Income transactions
    {
      type: "income",
      amount: 5000000,
      description: "Gaji Bulan Ini",
      category: "Gaji",
      daysAgo: 1,
    },
    {
      type: "income",
      amount: 2500000,
      description: "Proyek Website Klien",
      category: "Freelance",
      daysAgo: 5,
    },
    {
      type: "income",
      amount: 1000000,
      description: "Bonus Q2",
      category: "Bonus",
      daysAgo: 8,
    },
    {
      type: "income",
      amount: 750000,
      description: "Dividen Saham BBCA",
      category: "Investasi",
      daysAgo: 12,
    },
    {
      type: "income",
      amount: 1500000,
      description: "Proyek Desain Logo",
      category: "Freelance",
      daysAgo: 18,
    },
    {
      type: "income",
      amount: 300000,
      description: "Bunga Deposito",
      category: "Investasi",
      daysAgo: 25,
    },
    // Expense transactions
    {
      type: "expense",
      amount: 450000,
      description: "Makan di Restoran Padang",
      category: "Makanan",
      daysAgo: 0,
    },
    {
      type: "expense",
      amount: 250000,
      description: "Belanja Groceries Mingguan",
      category: "Makanan",
      daysAgo: 2,
    },
    {
      type: "expense",
      amount: 150000,
      description: "GrabCar ke Kantor",
      category: "Transportasi",
      daysAgo: 3,
    },
    {
      type: "expense",
      amount: 500000,
      description: "Beli Baju Lebaran",
      category: "Belanja",
      daysAgo: 4,
    },
    {
      type: "expense",
      amount: 350000,
      description: "Nonton Bioskop + Makan",
      category: "Hiburan",
      daysAgo: 6,
    },
    {
      type: "expense",
      amount: 750000,
      description: "Tagihan Listrik & Air",
      category: "Tagihan",
      daysAgo: 7,
    },
    {
      type: "expense",
      amount: 200000,
      description: "Isi Bensin Motor",
      category: "Transportasi",
      daysAgo: 9,
    },
    {
      type: "expense",
      amount: 300000,
      description: "Cek Kesehatan Rutin",
      category: "Kesehatan",
      daysAgo: 10,
    },
    {
      type: "expense",
      amount: 180000,
      description: "Langganan Spotify & Netflix",
      category: "Tagihan",
      daysAgo: 14,
    },
    {
      type: "expense",
      amount: 275000,
      description: "Makan All-You-Can-Eat",
      category: "Makanan",
      daysAgo: 16,
    },
    {
      type: "expense",
      amount: 400000,
      description: "Beli Sepatu Olahraga",
      category: "Belanja",
      daysAgo: 20,
    },
    {
      type: "expense",
      amount: 150000,
      description: "Parkir & Tol Bulan Ini",
      category: "Transportasi",
      daysAgo: 22,
    },
    {
      type: "expense",
      amount: 850000,
      description: "Tagihan Internet IndiHome",
      category: "Tagihan",
      daysAgo: 24,
    },
    {
      type: "expense",
      amount: 250000,
      description: "Belanja Vitamin & Suplemen",
      category: "Kesehatan",
      daysAgo: 27,
    },
    {
      type: "expense",
      amount: 200000,
      description: "Top-up Game Steam",
      category: "Hiburan",
      daysAgo: 28,
    },
  ];

  let transactionCount = 0;
  for (const tx of transactionData) {
    await db.transaction.create({
      data: {
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        categoryId: createdCategories[tx.category],
        userId: demo.id,
        date: daysAgo(tx.daysAgo),
      },
    });
    transactionCount++;
  }
  console.log(`✅ ${transactionCount} transactions created for demo user\n`);

  // ─── Savings Target for Demo User ──────────────────────────────────────
  const targetDate = new Date();
  targetDate.setFullYear(targetDate.getFullYear() + 1);
  targetDate.setMonth(11); // December
  targetDate.setDate(31);

  await db.savingsTarget.upsert({
    where: {
      id: `${demo.id}-dana-darurat`,
    },
    update: {},
    create: {
      id: `${demo.id}-dana-darurat`,
      name: "Dana Darurat",
      targetAmount: 50000000,
      currentAmount: 12500000,
      targetDate,
      initialInvestment: 5000000,
      monthlyContribution: 2000000,
      allocationPercentage: 0,
      isAllocated: false,
      userId: demo.id,
    },
  });
  console.log(`✅ 1 savings target created for demo user\n`);

  // ─── Summary ───────────────────────────────────────────────────────────
  const totalUsers = await db.user.count();
  const totalCategories = await db.category.count();
  const totalTransactions = await db.transaction.count();
  const totalSavingsTargets = await db.savingsTarget.count();

  console.log("══════════════════════════════════════════");
  console.log("  SEED COMPLETE - Summary:");
  console.log("══════════════════════════════════════════");
  console.log(`  👤 Users:             ${totalUsers}`);
  console.log(`  📂 Categories:        ${totalCategories}`);
  console.log(`  💳 Transactions:      ${totalTransactions}`);
  console.log(`  🎯 Savings Targets:   ${totalSavingsTargets}`);
  console.log("══════════════════════════════════════════\n");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
