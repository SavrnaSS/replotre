"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Lock } from "lucide-react";
import { BILLING_PLANS, type BillingKey, type PlanKey } from "@/app/config/billingPlans";
import { getInfluencerById } from "@/app/data/influencers";
import {
  addDays,
  getDailyQuotaForPlanInZone,
  getDateKeyInTimeZone,
} from "@/app/lib/schedule";

const DEFAULT_TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

type OnboardingProfile = {
  data: Record<string, any>;
  plan?: string | null;
  billing?: string | null;
};

export default function SchedulePage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [scheduleItems, setScheduleItems] = useState<
    Array<{
      id: string;
      time: string;
      label: string;
      title: string;
      src: string;
      scheduleDate: string;
      dateKey: string;
    }>
  >([]);
  const [scheduleExhausted, setScheduleExhausted] = useState(false);
  const [scheduleReason, setScheduleReason] = useState<string>("");
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan?: string | null;
    billing?: string | null;
    status?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [usedMap, setUsedMap] = useState<Record<string, boolean>>({});
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [timeHour, setTimeHour] = useState<string>("10");
  const [timeMinute, setTimeMinute] = useState<string>("00");
  const [timePeriod, setTimePeriod] = useState<"AM" | "PM">("AM");
  const [timeZone, setTimeZone] = useState<string>("UTC");
  const [timeZoneOptions, setTimeZoneOptions] = useState<string[]>(DEFAULT_TIME_ZONES);
  const [timeZoneTouched, setTimeZoneTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [timeSaved, setTimeSaved] = useState(false);
  const [timeError, setTimeError] = useState("");
  const autoSaveRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileRes, subRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }),
          fetch("/api/subscription/status", { cache: "no-store" }),
        ]);
        const profileData = await profileRes.json();
        const subData = await subRes.json();
        if (active) {
          setProfile(profileData?.profile ?? null);
          setSubscriptionInfo({
            plan: subData?.plan ?? null,
            billing: subData?.billing ?? null,
            status: subData?.status ?? null,
          });
        }
      } catch {
        if (active) {
          setProfile(null);
          setSubscriptionInfo(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const d = profile?.data || {};
    const influencerId = d.influencerId || "";
    const influencer = getInfluencerById(influencerId);
    return {
      influencerId,
      influencerSrc: influencer?.src || "/model/face-2-v2.jpg",
      influencerName: influencer?.name || "Creator Studio",
      plan: (subscriptionInfo?.plan || profile?.plan || "basic").toLowerCase(),
      billing:
        subscriptionInfo?.billing === "yearly" || profile?.billing === "yearly"
          ? "yearly"
          : "monthly",
      niche: d.niche || "—",
      scheduleTime: d.scheduleTime || "",
      scheduleTimeZone: d.scheduleTimeZone || "",
    };
  }, [profile, subscriptionInfo]);

  useEffect(() => {
    if (typeof Intl?.supportedValuesOf !== "function") return;
    const zones = Intl.supportedValuesOf("timeZone");
    if (!zones?.length) return;
    setTimeZoneOptions((prev) => {
      if (!prev.length) return zones;
      const merged = new Set(prev);
      zones.forEach((z) => merged.add(z));
      return Array.from(merged);
    });
  }, []);

  useEffect(() => {
    if (timeZoneTouched) return;
    if (summary.scheduleTimeZone) {
      setTimeZone(summary.scheduleTimeZone);
      return;
    }
    if (typeof Intl?.DateTimeFormat !== "function") return;
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (localZone) setTimeZone(localZone);
  }, [summary.scheduleTimeZone, timeZoneTouched]);

  const storageKey = useMemo(() => {
    const suffix = summary.influencerId || "default";
    return `gx_schedule_used_${suffix}`;
  }, [summary.influencerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setUsedMap(JSON.parse(raw));
      } else {
        setUsedMap({});
      }
    } catch {
      setUsedMap({});
    }
  }, [storageKey]);

  const markUsed = (key: string) => {
    setUsedMap((prev) => {
      const next = { ...prev, [key]: true };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  const makeItemKey = (id: string, src: string) =>
    `${summary.influencerId || "default"}:${id}-${src}`;

  const loadSchedule = useCallback(async () => {
    if (!summary.influencerId) {
      setScheduleItems([]);
      setScheduleExhausted(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/influencers/schedule-queue?influencerId=${summary.influencerId}&days=2`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setScheduleItems(nextItems);
      const exhausted = Boolean(data?.exhausted) && nextItems.length === 0;
      setScheduleExhausted(exhausted);
      setScheduleReason(exhausted ? String(data?.reason || "") : "");
    } catch {
      setScheduleItems([]);
      setScheduleExhausted(false);
      setScheduleReason("");
    }
  }, [summary.influencerId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      await loadSchedule();
    };
    load();
    return () => {
      active = false;
    };
  }, [loadSchedule]);

  useEffect(() => {
    const raw = summary.scheduleTime || "";
    if (!raw) {
      setScheduleTime("");
      setTimeHour("10");
      setTimeMinute("00");
      setTimePeriod("AM");
      setTimeTouched(false);
      setTimeError("");
      return;
    }
    const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      setScheduleTime(raw);
      setTimeTouched(false);
      setTimeError("");
      return;
    }
    const hour24 = Number(match[1]);
    const minute = match[2];
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    setScheduleTime(raw);
    setTimeHour(String(hour12));
    setTimeMinute(minute);
    setTimePeriod(period);
    setTimeTouched(false);
    setTimeError("");
  }, [summary.scheduleTime]);

  const saveScheduleTime = useCallback(async (silent = false) => {
    if (!scheduleTime) return;
    const match = scheduleTime.match(/^([01]?\d|2[0-3]):[0-5]\d$/);
    if (!match) {
      if (!silent) setTimeError("Use HH:MM (24h) format.");
      return;
    }
    setTimeError("");
    setSavingTime(true);
    if (!silent) setTimeSaved(false);
    try {
      const res = await fetch("/api/schedule-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleTime, scheduleTimeZone: timeZone }),
      });
      if (res.ok) {
        if (!silent) {
          setTimeSaved(true);
          setTimeout(() => setTimeSaved(false), 2000);
        }
        await loadSchedule();
      }
    } finally {
      setSavingTime(false);
    }
  }, [loadSchedule, scheduleTime, timeZone]);

  useEffect(() => {
    if (!timeZoneTouched) return;
    if (!scheduleTime) return;
    if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
    autoSaveRef.current = window.setTimeout(() => {
      saveScheduleTime(true);
    }, 700);
    return () => {
      if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
    };
  }, [timeZone, timeZoneTouched, scheduleTime, saveScheduleTime]);

  useEffect(() => {
    if (!timeTouched) return;
    const hourNum = Number(timeHour);
    if (Number.isNaN(hourNum)) return;
    const hour24 =
      timePeriod === "PM"
        ? hourNum % 12 + 12
        : hourNum % 12;
    const next = `${String(hour24).padStart(2, "0")}:${timeMinute}`;
    setScheduleTime(next);
  }, [timeHour, timeMinute, timePeriod, timeTouched]);

  useEffect(() => {
    if (!timeTouched) return;
    if (!scheduleTime) return;
    if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
    autoSaveRef.current = window.setTimeout(() => {
      saveScheduleTime(true);
    }, 700);
    return () => {
      if (autoSaveRef.current) window.clearTimeout(autoSaveRef.current);
    };
  }, [scheduleTime, timeTouched, saveScheduleTime]);

  const planEntry = useMemo(() => {
    const plan = (summary.plan || "basic") as PlanKey;
    const billing = summary.billing as BillingKey;
    return BILLING_PLANS[billing][plan];
  }, [summary.billing, summary.plan]);

  const planCapabilities = useMemo(() => {
    const plan = summary.plan;
    const isPro = plan === "pro";
    const isElite = plan === "elite";
    return {
      credits: planEntry?.credits ?? 0,
      modelTokens: isElite ? 6 : isPro ? 2 : 1,
      scheduledPosts: isElite ? 180 : isPro ? 60 : 15,
      nsfwScheduled: plan !== "basic",
      videoEnabled: plan !== "basic",
    };
  }, [planEntry?.credits, summary.plan]);

  const schedulePreview = useMemo(() => {
    return scheduleItems.map((item) => {
      return {
        ...item,
        creator: summary.influencerName,
      };
    });
  }, [scheduleItems, summary.influencerName]);

  const groupedSchedule = useMemo(() => {
    const zone = summary.scheduleTimeZone || timeZone || "UTC";
    const todayDate = new Date();
    const earliestScheduled =
      schedulePreview.length > 0
        ? new Date(
            Math.min(
              ...schedulePreview.map((item) =>
                item.scheduleDate ? new Date(item.scheduleDate).getTime() : todayDate.getTime()
              )
            )
          )
        : todayDate;
    const anchorDate = earliestScheduled;
    const tomorrowDate = addDays(todayDate, 1);
    const todayKey = getDateKeyInTimeZone(todayDate, zone);
    const tomorrowKey = getDateKeyInTimeZone(tomorrowDate, zone);
    const todayLimit = getDailyQuotaForPlanInZone(summary.plan, todayDate, zone, anchorDate);
    const tomorrowLimit = getDailyQuotaForPlanInZone(summary.plan, tomorrowDate, zone, anchorDate);

    const buckets = new Map<string, typeof schedulePreview>();
    for (const item of schedulePreview) {
      const list = buckets.get(item.dateKey) || [];
      list.push(item);
      buckets.set(item.dateKey, list);
    }

    const sortByTime = (items: typeof schedulePreview) =>
      [...items].sort((a, b) => a.time.localeCompare(b.time));

    const today = sortByTime(buckets.get(todayKey) || []).slice(0, todayLimit);
    const tomorrow = sortByTime(buckets.get(tomorrowKey) || []).slice(0, tomorrowLimit);

    return [
      { id: "today", label: "Today", hint: "Next 24 hours", items: today },
      { id: "tomorrow", label: "Tomorrow", hint: "Next 48 hours", items: tomorrow },
    ].filter((group) => group.items.length);
  }, [schedulePreview, summary.plan, summary.scheduleTimeZone, timeZone]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back to playground
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
                  <CalendarDays size={18} className="text-indigo-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Scheduling
                  </p>
                  <h1 className="text-2xl font-semibold">Studio schedule</h1>
                  <p className="mt-1 text-sm text-white/55">
                    Automated cadence aligned to your plan and creator model.
                  </p>
                </div>
              </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/70">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                How it works
              </p>
              <ul className="mt-3 space-y-2">
                <li>• We pull scheduled assets from your influencer queue.</li>
                <li>• Posts auto-publish at your plan cadence.</li>
                <li>• Download assets anytime or upgrade for NSFW/video access.</li>
              </ul>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Plan limits
                </p>
                <div className="mt-3 space-y-2 text-xs text-white/70">
                  <div className="flex items-center justify-between">
                    <span>Monthly credits</span>
                    <span className="font-semibold text-white/85">{planCapabilities.credits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Model tokens</span>
                    <span className="font-semibold text-white/85">{planCapabilities.modelTokens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Scheduled posts</span>
                    <span className="font-semibold text-white/85">{planCapabilities.scheduledPosts}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Feature access
                </p>
                <div className="mt-3 grid gap-3 text-xs">
                  <div
                    className={`rounded-xl border px-3 py-2 ${
                      planCapabilities.videoEnabled
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-rose-300/30 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    Video scheduling:{" "}
                    {planCapabilities.videoEnabled ? "Enabled" : "Upgrade to Pro"}
                  </div>
                  <div
                    className={`rounded-xl border px-3 py-2 ${
                      planCapabilities.nsfwScheduled
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-rose-300/30 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    NSFW schedule:{" "}
                    {planCapabilities.nsfwScheduled ? "Enabled" : "Upgrade to Pro"}
                  </div>
                </div>
              </div>
            </div>

            {!planCapabilities.videoEnabled && (
              <button
                type="button"
                onClick={() => (window.location.href = "/subscription")}
                className="mt-6 w-full rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-2 text-sm text-indigo-100 transition hover:bg-indigo-500/25"
              >
                Upgrade plan
              </button>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Schedule preview
                </p>
                <h2 className="mt-2 text-lg font-semibold">Next 24 hours</h2>
                <p className="mt-1 text-xs text-white/55">
                  Auto-populated from influencer schedule assets.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                        Preferred time
                      </p>
                      <p className="text-[11px] text-white/60">
                        Schedules in your local time zone{" "}
                        <span className="text-white/40">({timeZone || "UTC"})</span>
                        .
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveScheduleTime(false)}
                      disabled={!scheduleTime || savingTime}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] text-white/80 transition hover:bg-white/20 disabled:opacity-50"
                    >
                      {savingTime ? "Saving…" : timeSaved ? "Saved" : "Set time"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2 py-1">
                      <select
                        value={timeHour}
                        onChange={(e) => {
                          setTimeTouched(true);
                          setTimeHour(e.target.value);
                        }}
                        className="bg-transparent text-sm text-white/90 outline-none"
                      >
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const h = idx + 1;
                          return (
                            <option key={h} value={String(h)} className="bg-black">
                              {h}
                            </option>
                          );
                        })}
                      </select>
                      <span className="text-sm text-white/70">:</span>
                      <select
                        value={timeMinute}
                        onChange={(e) => {
                          setTimeTouched(true);
                          setTimeMinute(e.target.value);
                        }}
                        className="bg-transparent text-sm text-white/90 outline-none"
                      >
                        {["00", "15", "30", "45"].map((m) => (
                          <option key={m} value={m} className="bg-black">
                            {m}
                          </option>
                        ))}
                      </select>
                      <div className="ml-1 flex rounded-full border border-white/10 bg-black/40">
                        {(["AM", "PM"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setTimeTouched(true);
                              setTimePeriod(p);
                            }}
                            className={`px-2.5 py-1 text-[11px] transition ${
                              timePeriod === p
                                ? "rounded-full bg-indigo-500/30 text-white"
                                : "text-white/60 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { label: "Morning", value: "08:00" },
                        { label: "Late morning", value: "10:00" },
                        { label: "Noon", value: "12:00" },
                        { label: "Afternoon", value: "15:00" },
                        { label: "Evening", value: "18:00" },
                        { label: "Prime time", value: "20:00" },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setTimeTouched(true);
                            const match = preset.value.match(/^(\d{2}):(\d{2})$/);
                            if (!match) return;
                            const hour24 = Number(match[1]);
                            const minute = match[2];
                            const period = hour24 >= 12 ? "PM" : "AM";
                            const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
                            setTimeHour(String(hour12));
                            setTimeMinute(minute);
                            setTimePeriod(period);
                          }}
                          className={`rounded-full border px-3 py-1 text-[11px] transition ${
                            scheduleTime === preset.value
                              ? "border-indigo-300/40 bg-indigo-500/20 text-indigo-100"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                      Time zone
                    </label>
                    <select
                      value={timeZone}
                      onChange={(e) => {
                        setTimeZoneTouched(true);
                        setTimeZone(e.target.value);
                      }}
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                    >
                      {timeZoneOptions.map((tz) => (
                        <option key={tz} value={tz} className="bg-black">
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  {timeError && <span className="text-[11px] text-rose-200/80">{timeError}</span>}
                </div>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/60">
                  Auto cadence
                </span>
                <span className="rounded-full border border-indigo-300/25 bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-100">
                  Auto publish
                </span>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-white/60">Loading schedule…</div>
            ) : (
              <div className="mt-6 space-y-6">
                {scheduleExhausted && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {scheduleReason === "admin-disabled"
                      ? "Scheduling is paused by admin. We’ll notify you when it resumes."
                      : "Scheduling is currently unavailable. We’ll get back to you ASAP."}
                  </div>
                )}
                {groupedSchedule.length ? (
                  <div className="space-y-8">
                    {groupedSchedule.map((group) => (
                      <div key={group.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                              {group.label}
                            </p>
                            <p className="mt-1 text-xs text-white/60">{group.hint}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] text-white/60">
                            Auto cadence
                          </span>
                        </div>
                        <div className="gx-masonry">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className="gx-masonry-item overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
                            >
                              <div className="flex items-center justify-between px-4 py-3 text-xs text-white/70">
                                <div className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={summary.influencerSrc}
                                    alt={summary.influencerName}
                                    className="h-7 w-7 rounded-full object-cover"
                                  />
                                  <span className="font-semibold text-white/85">{item.creator}</span>
                                </div>
                                <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-white/60">
                                  {usedMap[makeItemKey(item.id, item.src)] ? "Downloaded" : "Scheduled"}
                                </span>
                              </div>
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.src}
                                  alt="Scheduled preview"
                                  className="aspect-[4/5] w-full object-cover"
                                />
                                <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] text-white/90">
                                  {item.time}
                                </div>
                              </div>
                              <div className="px-4 py-3 text-xs text-white/70">
                                <p className="text-[11px] text-white/50">{item.label}</p>
                                <p className="mt-1 text-sm text-white/85">{item.title}</p>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[11px] text-white/45">Ready to publish</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] text-white/70 transition hover:bg-black/40"
                                    >
                                      Queue
                                    </button>
                                    <a
                                      href={item.src}
                                      download
                                      onClick={() => markUsed(makeItemKey(item.id, item.src))}
                                      className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1 text-[10px] text-indigo-100 transition hover:bg-indigo-500/20"
                                    >
                                      {usedMap[makeItemKey(item.id, item.src)] ? "Downloaded" : "Download"}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/60">No scheduled posts yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .gx-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 420px));
          gap: 16px;
          justify-content: center;
          justify-items: center;
        }
        .gx-masonry-item {
          width: min(100%, 420px);
        }
        @media (min-width: 1024px) {
          .gx-masonry {
            grid-template-columns: repeat(auto-fit, minmax(320px, 440px));
          }
          .gx-masonry-item {
            width: min(100%, 440px);
          }
        }
      `}</style>
    </main>
  );
}
