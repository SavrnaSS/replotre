import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";
import { isAdminEmail } from "@/app/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const sessionToken = cookieStore.get("mitux_session")?.value || "";
  const authHeader =
    headerStore.get("authorization") || headerStore.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const token = bearer || sessionToken;

  const payload = token ? verifyToken(token) : null;
  const userId = payload?.id || payload?.userId;
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  return <>{children}</>;
}
