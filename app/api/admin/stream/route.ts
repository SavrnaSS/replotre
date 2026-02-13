import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { subscribeAdminStream } from "@/app/lib/adminStream";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send("ready", { ok: true, at: Date.now() });

      const unsubscribe = subscribeAdminStream((event) => {
        send("update", {
          type: event.type,
          ...event.payload,
          at: Date.now(),
        });
      });

      const interval = setInterval(() => {
        send("ping", { at: Date.now() });
      }, 25000);

      return () => {
        closed = true;
        unsubscribe();
        clearInterval(interval);
      };
    },
    cancel() {
      // handled by start cleanup
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
