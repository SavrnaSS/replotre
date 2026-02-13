import { Suspense } from "react";
import CheckoutCompleteClient from "./pageClient";

export default function CheckoutCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07060b] text-white">
          <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-sm text-white/70">
              Loading payment status...
            </div>
          </div>
        </div>
      }
    >
      <CheckoutCompleteClient />
    </Suspense>
  );
}
