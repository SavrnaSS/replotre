import prisma from "@/app/lib/prisma";

export async function claimOnboardingDraft({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const draft = await prisma.onboardingDraft.findUnique({
    where: { email: normalized },
  });
  if (!draft) return;

  await prisma.onboardingProfile.upsert({
    where: { userId },
    create: {
      userId,
      data: draft.data ?? {},
      plan: draft.plan ?? null,
      billing: draft.billing ?? null,
    },
    update: {
      data: draft.data ?? {},
      plan: draft.plan ?? null,
      billing: draft.billing ?? null,
    },
  });

  await prisma.onboardingDraft.delete({
    where: { email: normalized },
  });
}
