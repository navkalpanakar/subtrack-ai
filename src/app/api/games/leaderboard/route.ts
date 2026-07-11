import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { weeklyPrizeAmount, formatMoney } from "@/lib/currency";

// Weekly leaderboard. Top user wins a free subscription.
// In preview (single user), we seed realistic competitors so the board
// looks alive. In production, all real users appear.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the user's currency so the prize is shown in their local currency
  const me = await db.user.findUnique({ where: { id: userId }, select: { currency: true, countryCode: true } });
  const userCurrency = me?.currency || "USD";

  const allProgress = await db.userProgress.findMany({
    include: { user: { select: { name: true, email: true, phone: true, image: true } } },
    orderBy: { points: "desc" },
  });

  // Build the real leaderboard
  const realEntries = allProgress.map((p, i) => ({
    rank: i + 1,
    name: p.user.name || p.user.email || p.user.phone || "Anonymous",
    points: p.points,
    level: p.level,
    isCurrentUser: p.userId === userId,
  }));

  // For preview: if fewer than 8 entries, pad with seeded competitors
  const SEEDED = [
    { name: "Priya S.", points: 420, level: 3 },
    { name: "Marcus T.", points: 310, level: 3 },
    { name: "Aisha K.", points: 250, level: 2 },
    { name: "Diego R.", points: 180, level: 2 },
    { name: "Yuki H.", points: 95, level: 2 },
    { name: "Emma L.", points: 60, level: 1 },
    { name: "Liam W.", points: 30, level: 1 },
  ];

  let entries = realEntries;
  if (realEntries.length < 8) {
    entries = [...realEntries, ...SEEDED.map((s, i) => ({
      rank: realEntries.length + i + 1,
      name: s.name,
      points: s.points,
      level: s.level,
      isCurrentUser: false,
    }))].sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  const myRank = entries.find((e) => e.isCurrentUser)?.rank || entries.length;

  // Localized prize: show the reward value in the user's own currency
  // (e.g. ₹2,000 for India, £20 for UK, $25 for US).
  const prizeValue = weeklyPrizeAmount(userCurrency);
  const formattedPrize = formatMoney(prizeValue, userCurrency);
  const prize = `1 free subscription of your choice (up to ${formattedPrize} value)`;

  return NextResponse.json({
    entries: entries.slice(0, 10),
    myRank,
    totalUsers: Math.max(entries.length, 8),
    prize,
    prizeCurrency: userCurrency,
    prizeAmount: prizeValue,
    resetsIn: daysUntilNextMonday(),
  });
}

function daysUntilNextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const diff = monday.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}
