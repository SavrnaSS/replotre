// app/terms/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthWall from "@/app/components/AuthWall";
import {
  ArrowRight,
  ShieldCheck,
  Scale,
  ChevronUp,
  FileText,
  Lock,
} from "lucide-react";

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
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-purple-400/80 shrink-0" />
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

export default function TermsAndConditionsPage() {
  const [showTop, setShowTop] = useState(false);

  // ✅ Avoid hydration issues: keep this as a stable string (no new Date() in render)
  const lastUpdated = useMemo(() => "30 Dec 2025", []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toc = [
    { id: "intro", label: "Overview" },
    { id: "acceptance", label: "Acceptance" },
    { id: "eligibility", label: "Eligibility" },
    { id: "accounts", label: "Accounts" },
    { id: "credits", label: "Credits & Billing" },
    { id: "uploads", label: "Uploads & Permissions" },
    { id: "ai", label: "AI Output Disclaimer" },
    { id: "prohibited", label: "Prohibited Use" },
    { id: "ip", label: "Intellectual Property" },
    { id: "privacy", label: "Privacy" },
    { id: "termination", label: "Termination" },
    { id: "liability", label: "Limitation of Liability" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <AuthWall mode="soft">
      <div className="relative min-h-screen bg-[#07070B] text-white pb-24 overflow-hidden">
        {/* Ambient */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-purple-600/18 blur-[140px]" />
          <div className="absolute bottom-[-240px] right-[-140px] h-[560px] w-[560px] rounded-full bg-indigo-500/16 blur-[140px]" />
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
                    href="/privacy"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Privacy Policy <ArrowRight size={14} />
                  </Link>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
                    <ShieldCheck size={14} />
                    Last updated: {lastUpdated}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <Scale size={18} className="text-white/80" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-3xl font-semibold leading-tight break-words">
                      Terms &amp; Conditions
                    </h1>
                    <p className="mt-1 text-[12px] sm:text-sm text-white/60 leading-snug break-words">
                      These Terms govern your use of Gerox. By accessing or using the
                      Service, you agree to these Terms.
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
                    Summary: Use Gerox responsibly, only upload content you have rights
                    to, and understand AI outputs can be imperfect.
                  </div>
                </div>
              </div>
            </aside>

            {/* Sections */}
            <section className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-5">
              <Section id="intro" title="1) Overview">
                <p>
                  Gerox (“Gerox”, “we”, “us”) provides AI-powered tools for face swap
                  and image generation (“Service”). These Terms apply to your use of
                  the Service, website, and related features.
                </p>
              </Section>

              <Section id="acceptance" title="2) Acceptance of Terms">
                <p>
                  By accessing or using the Service, you agree to be bound by these
                  Terms and our Privacy Policy. If you do not agree, do not use the
                  Service.
                </p>
              </Section>

              <Section id="eligibility" title="3) Eligibility">
                <p>
                  You must be at least the minimum age required in your jurisdiction
                  to use the Service. If you are under 18, you confirm you have
                  permission from a parent or legal guardian.
                </p>
              </Section>

              <Section id="accounts" title="4) Accounts & Access">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    You are responsible for maintaining the confidentiality of your
                    account and activity under your account.
                  </li>
                  <li>
                    You agree to provide accurate information and keep it updated.
                  </li>
                  <li>
                    We may suspend access if we detect suspicious activity or misuse.
                  </li>
                </ul>
              </Section>

              <Section id="credits" title="5) Credits, Billing & Payments">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Some features require credits or paid plans. Pricing may change
                    over time.
                  </li>
                  <li>
                    Credits are consumed when generation actions are performed.
                  </li>
                  <li>
                    Unless required by law, credits are non-refundable once used.
                  </li>
                </ul>
              </Section>

              <Section id="uploads" title="6) Uploads, Permissions & User Content">
                <p className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 text-white/70 shrink-0" />
                  <span>
                    You retain ownership of the images you upload. However, you grant
                    Gerox a limited, non-exclusive license to process your uploads to
                    provide the Service (e.g., face swapping, generation, previews).
                  </span>
                </p>
                <p className="mt-3 flex items-start gap-2">
                  <Lock size={16} className="mt-0.5 text-white/70 shrink-0" />
                  <span>
                    You confirm you have all necessary rights and consents to upload
                    images (including people’s faces). Do not upload content you do
                    not own or have permission to use.
                  </span>
                </p>
              </Section>

              <Section id="ai" title="7) AI Output Disclaimer">
                <p>
                  AI-generated images may be inaccurate, unexpected, or resemble
                  real-world elements unintentionally. You are responsible for how
                  you use and share outputs.
                </p>
                <p className="mt-3">
                  The Service is provided “as-is” and “as available.” We do not
                  guarantee that outputs will meet your requirements or be error-free.
                </p>
              </Section>

              <Section id="prohibited" title="8) Prohibited Use">
                <p>You agree not to:</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>Upload images without proper consent or legal rights.</li>
                  <li>Impersonate individuals or create deceptive content.</li>
                  <li>
                    Generate content that is unlawful, abusive, hateful, or violates
                    others’ rights.
                  </li>
                  <li>
                    Attempt to exploit, reverse engineer, scrape, or disrupt the
                    Service.
                  </li>
                </ul>
              </Section>

              <Section id="ip" title="9) Intellectual Property">
                <p>
                  The Gerox brand, UI, design, and underlying software are protected
                  by applicable intellectual property laws. You may not copy,
                  redistribute, or resell any part of the Service without written
                  permission.
                </p>
              </Section>

              <Section id="privacy" title="10) Privacy">
                <p>
                  Our Privacy Policy explains how we collect and use data. By using
                  the Service, you agree to the data practices described there.
                </p>
              </Section>

              <Section id="termination" title="11) Suspension & Termination">
                <p>
                  We may suspend or terminate your access if you violate these Terms,
                  misuse the Service, or if required to comply with law.
                </p>
              </Section>

              <Section id="liability" title="12) Limitation of Liability">
                <p>
                  To the maximum extent permitted by law, Gerox will not be liable for
                  indirect, incidental, special, or consequential damages arising from
                  your use of the Service, including loss of data or profits.
                </p>
              </Section>

              <Section id="changes" title="13) Changes to These Terms">
                <p>
                  We may update these Terms from time to time. We will update the “Last
                  updated” date above. Continued use of the Service after changes means
                  you accept the revised Terms.
                </p>
              </Section>

              <Section id="contact" title="14) Contact">
                <p>
                  Questions about these Terms? Contact{" "}
                  <span className="text-white/85 font-semibold">support@gerox.ai</span>.
                  (Replace with your real support email if needed.)
                </p>
              </Section>

              {/* Footer CTA */}
              <div className="mt-2 rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-[11px] sm:text-xs text-white/45">
                  Last updated: {lastUpdated}
                </p>
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                >
                  Go to Workspace <ArrowRight size={18} />
                </Link>
              </div>
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
      </div>
    </AuthWall>
  );
}
