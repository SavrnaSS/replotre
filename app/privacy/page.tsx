"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthWall from "@/app/components/AuthWall";
import { ArrowRight, Shield, Database, ChevronUp } from "lucide-react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-400/80 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold leading-tight break-words">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-3 text-[12px] sm:text-sm text-white/70 leading-relaxed break-words">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  const [showTop, setShowTop] = useState(false);

  // ✅ stable string (no hydration mismatch)
  const lastUpdated = useMemo(() => "30 Dec 2025", []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toc = [
    { id: "intro", label: "Overview" },
    { id: "data", label: "Data We Collect" },
    { id: "use", label: "How We Use Data" },
    { id: "faces", label: "Face Photos & AI Processing" },
    { id: "storage", label: "Local Storage on Your Device" },
    { id: "sharing", label: "Sharing & Disclosure" },
    { id: "retention", label: "Retention" },
    { id: "security", label: "Security" },
    { id: "rights", label: "Your Rights" },
    { id: "children", label: "Children" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <AuthWall mode="soft">
      <div className="relative min-h-screen bg-[#07070B] text-white pb-24 overflow-hidden">
        {/* Ambient */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-indigo-500/16 blur-[140px]" />
          <div className="absolute bottom-[-240px] right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-600/14 blur-[140px]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/50" />
        </div>

        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          {/* Header */}
          <header className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/25 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Back to Workspace <ArrowRight size={14} />
                  </Link>

                  <Link
                    href="/terms"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Terms <ArrowRight size={14} />
                  </Link>

                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
                    <Shield size={14} />
                    Last updated: {lastUpdated}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <Database size={18} className="text-white/80" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-3xl font-semibold leading-tight break-words">
                      Privacy Policy
                    </h1>
                    <p className="mt-1 text-[12px] sm:text-sm text-white/60 leading-snug break-words">
                      This Privacy Policy explains how Gerox collects, uses, and
                      protects your information when you use the Service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-px bg-white/10" />
          </header>

          {/* Content */}
          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* TOC */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="sticky top-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-3">
                    Contents
                  </p>

                  <div className="grid gap-2">
                    {toc.map((t) => (
                      <a
                        key={t.id}
                        href={`#${t.id}`}
                        className="rounded-2xl px-3 py-2 text-[12px] sm:text-sm bg-black/25 border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20 transition"
                      >
                        {t.label}
                      </a>
                    ))}
                  </div>

                  <div className="mt-4 text-[11px] text-white/55 leading-snug">
                    Summary: we use your data to provide the Service, improve
                    quality, and keep things secure.
                  </div>
                </div>
              </div>
            </aside>

            {/* Sections */}
            <section className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-5">
              <Section id="intro" title="1) Overview">
                <p>
                  Gerox (“we”, “us”) operates an AI image generation service
                  (“Service”). This Policy describes what we collect and how we
                  handle it.
                </p>
              </Section>

              <Section id="data" title="2) Data We Collect">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="text-white/85 font-semibold">
                      Account data:
                    </span>{" "}
                    email/username, authentication identifiers, and basic profile
                    info.
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">
                      Uploads:
                    </span>{" "}
                    images you upload for face swap or photoshoot generation.
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">
                      Generated outputs:
                    </span>{" "}
                    images produced by the Service (and related metadata like
                    timestamps).
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">
                      Usage data:
                    </span>{" "}
                    interaction events, feature usage, and performance/diagnostic
                    data.
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">
                      Payment data:
                    </span>{" "}
                    handled by payment processors; we may receive payment
                    confirmations and plan/credit info (not full card numbers).
                  </li>
                </ul>
              </Section>

              <Section id="use" title="3) How We Use Data">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Provide and operate the Service (generation, downloads,
                    history).
                  </li>
                  <li>Maintain safety, prevent fraud/abuse, and enforce Terms.</li>
                  <li>Improve product quality and user experience.</li>
                  <li>
                    Customer support and communications (service-related notices).
                  </li>
                </ul>
              </Section>

              <Section id="faces" title="4) Face Photos & AI Processing">
                <p>
                  When you upload a face photo, we process it to generate results
                  you request. You must have the legal right and consent to
                  upload and use that image.
                </p>
                <p className="mt-3">
                  AI outputs can sometimes be inaccurate or unexpected. Please
                  review results before sharing or using them publicly.
                </p>
              </Section>

              <Section id="storage" title="5) Local Storage on Your Device">
                <p>
                  Some features may store small preferences locally in your
                  browser (e.g., selected theme, thumbnails, or cached results)
                  to improve speed and user experience.
                </p>
                <p className="mt-3">
                  You can clear these by clearing your browser storage/site data.
                </p>
              </Section>

              <Section id="sharing" title="6) Sharing & Disclosure">
                <p>We may share information:</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>
                    With service providers (hosting, analytics, storage, payments)
                    strictly to operate the Service.
                  </li>
                  <li>
                    If required by law, legal process, or to protect
                    rights/safety.
                  </li>
                  <li>
                    In connection with a business transfer (e.g.,
                    merger/acquisition), subject to this Policy.
                  </li>
                </ul>
              </Section>

              <Section id="retention" title="7) Retention">
                <p>
                  We retain data as long as needed to provide the Service, comply
                  with legal obligations, resolve disputes, and enforce
                  agreements. Retention periods may vary by data type and
                  jurisdiction.
                </p>
              </Section>

              <Section id="security" title="8) Security">
                <p>
                  We use reasonable administrative, technical, and physical
                  safeguards to protect your data. However, no method of
                  transmission or storage is 100% secure.
                </p>
              </Section>

              <Section id="rights" title="9) Your Rights">
                <p>
                  Depending on your location, you may have rights to access,
                  correct, delete, or export your personal information, or object
                  to certain processing.
                </p>
                <p className="mt-3">
                  To request help, contact{" "}
                  <span className="text-white/85 font-semibold">
                    support@gerox.in
                  </span>
                  .
                </p>
              </Section>

              <Section id="children" title="10) Children">
                <p>
                  The Service is not intended for children under the age required
                  by local law to consent to data processing without parental
                  permission.
                </p>
              </Section>

              <Section id="changes" title="11) Changes to this Policy">
                <p>
                  We may update this Policy from time to time. We’ll update the
                  “Last updated” date and may provide additional notice when
                  required.
                </p>
              </Section>

              <Section id="contact" title="12) Contact">
                <p>
                  Contact us with privacy questions at{" "}
                  <span className="text-white/85 font-semibold">
                    support@gerox.ai
                  </span>
                  .
                </p>
              </Section>
            </section>
          </div>

          {/* Back to top */}
          {showTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-6 z-50 rounded-2xl p-3 bg-white/10 border border-white/15 hover:bg-white/15 transition shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
              aria-label="Back to top"
            >
              <ChevronUp size={18} />
            </button>
          )}
        </main>

        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }
          @media (prefers-reduced-motion: reduce) {
            html {
              scroll-behavior: auto;
            }
          }
        `}</style>
      </div>
    </AuthWall>
  );
}
