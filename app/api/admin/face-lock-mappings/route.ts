import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/adminAuth";
import { getInfluencerById } from "@/app/data/influencers";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function parsePositiveInt(raw: string | null, fallback: number) {
  const n = Number(raw || "");
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const take = Math.min(parsePositiveInt(url.searchParams.get("take"), 200), 1000);
  const skip = parsePositiveInt(url.searchParams.get("skip"), 0);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      onboardingProfile: {
        select: {
          updatedAt: true,
          data: true,
        },
      },
    },
    take,
    skip,
  });

  const mappings = users.map((user) => {
    const profileData = asRecord(user.onboardingProfile?.data);
    const influencerId = String(profileData.influencerId || "").trim();
    const influencer = influencerId ? getInfluencerById(influencerId) : null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      onboardingUpdatedAt: user.onboardingProfile?.updatedAt || null,
      mappingStatus: influencer ? "mapped" : "unmapped",
      influencerId: influencerId || null,
      influencerName: influencer?.name || null,
      faceSrc: influencer?.src || null,
      lockMode: influencer ? "server_mapped" : null,
      primaryFaceRequired: Boolean(influencer),
    };
  });

  const summary = mappings.reduce(
    (acc, item) => {
      if (item.mappingStatus === "mapped") {
        acc.mapped += 1;
      } else {
        acc.unmapped += 1;
      }
      return acc;
    },
    { mapped: 0, unmapped: 0 }
  );

  return NextResponse.json(
    {
      total: mappings.length,
      take,
      skip,
      summary,
      mappings,
    },
    { status: 200 }
  );
}
