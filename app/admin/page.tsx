"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OnboardingProfile = {
  plan?: string | null;
  billing?: string | null;
  allowEdit?: boolean | null;
  completedAt?: string | null;
};

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  credits?: number | null;
  onboardingProfile?: OnboardingProfile | null;
};

type Subscription = {
  id: string;
  userId: string;
  plan: string;
  billing: string;
  amount: number;
  status: string;
  startedAt: string;
  nextChargeAt?: string | null;
};

type BillingRecord = {
  id: string;
  userId: string;
  amount: number;
  status?: string | null;
  plan?: string | null;
  billing?: string | null;
  createdAt: string;
  user?: { id: string; email?: string | null; name?: string | null } | null;
};

type ChangeRequest = {
  id: string;
  userId: string;
  message: string;
  status: string;
  createdAt: string;
};

type Refund = {
  id: string;
  userId: string;
  amount: number;
  reason?: string | null;
  status: string;
  requestedAt: string;
};

type AdminNote = {
  id: string;
  userId: string;
  note: string;
  createdAt: string;
};

type AdminAction = {
  id: string;
  userId: string;
  action: string;
  detail?: string | null;
  createdAt: string;
};

type ScheduledPost = {
  id: string;
  userId: string;
  influencerId: string;
  imageSrc: string;
  scheduleDate: string;
  time: string;
  status: string;
  adminNote?: string | null;
};

type ScheduleOverride = {
  id: string;
  userId?: string | null;
  influencerId?: string | null;
  disabled?: boolean | null;
  paused?: boolean | null;
  overrideDaily?: number | null;
  overrideMonthly?: number | null;
  overrideTime?: string | null;
  overrideTimeZone?: string | null;
  reason?: string | null;
  createdAt: string;
};

type ScheduleAlert = AdminAction & {
  user?: { id: string; email?: string | null; name?: string | null } | null;
};

type FaceLockMapping = {
  userId: string;
  email?: string | null;
  name?: string | null;
  createdAt: string;
  onboardingUpdatedAt?: string | null;
  mappingStatus: "mapped" | "unmapped";
  influencerId?: string | null;
  influencerName?: string | null;
  faceSrc?: string | null;
  lockMode?: string | null;
  primaryFaceRequired?: boolean;
};

type FaceLockPayload = {
  total: number;
  take: number;
  skip: number;
  summary?: { mapped: number; unmapped: number };
  mappings: FaceLockMapping[];
};

const PLAN_OPTIONS = ["basic", "pro", "elite"] as const;
const BILLING_OPTIONS = ["monthly", "yearly"] as const;
const STATUS_OPTIONS = ["Active", "Paused", "Suspended"] as const;

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function postJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [scheduleAlerts, setScheduleAlerts] = useState<ScheduleAlert[]>([]);
  const [faceLockMappings, setFaceLockMappings] = useState<FaceLockMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string>("");
  const [streamStatus, setStreamStatus] = useState<"idle" | "connecting" | "connected" | "error">(
    "idle"
  );
  const streamRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number | undefined>(undefined);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editStatus, setEditStatus] = useState<string>("Active");
  const [editCredits, setEditCredits] = useState<string>("0");
  const [editAllowEdit, setEditAllowEdit] = useState<boolean>(false);
  const [editPlan, setEditPlan] = useState<string>("pro");
  const [editBilling, setEditBilling] = useState<string>("monthly");
  const [planReason, setPlanReason] = useState<string>("");
  const [creditDelta, setCreditDelta] = useState<string>("0");
  const [creditReason, setCreditReason] = useState<string>("");
  const [userNotes, setUserNotes] = useState<AdminNote[]>([]);
  const [userActions, setUserActions] = useState<AdminAction[]>([]);
  const [userHistory, setUserHistory] = useState<BillingRecord[]>([]);
  const [noteInput, setNoteInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterBilling, setFilterBilling] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLock, setFilterLock] = useState<string>("all");
  const [scheduleInfluencerId, setScheduleInfluencerId] = useState<string>("");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
  const [overrideDisabled, setOverrideDisabled] = useState(false);
  const [overridePaused, setOverridePaused] = useState(false);
  const [overrideDaily, setOverrideDaily] = useState<string>("");
  const [overrideMonthly, setOverrideMonthly] = useState<string>("");
  const [overrideTime, setOverrideTime] = useState<string>("");
  const [overrideTimeZone, setOverrideTimeZone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [rescheduleDrafts, setRescheduleDrafts] = useState<
    Record<string, { date: string; time: string }>
  >({});
  const [bulkShiftDays, setBulkShiftDays] = useState<string>("0");
  const [bulkSetTime, setBulkSetTime] = useState<string>("");
  const [bulkCancelReason, setBulkCancelReason] = useState<string>("");
  const [adminTab, setAdminTab] = useState<"profile" | "scheduling">("profile");
  const [faceSearch, setFaceSearch] = useState<string>("");
  const [faceStatusFilter, setFaceStatusFilter] = useState<"all" | "mapped" | "unmapped">("all");
  const [faceInfluencerFilter, setFaceInfluencerFilter] = useState<string>("all");
  const [faceOnlyPrimaryRequired, setFaceOnlyPrimaryRequired] = useState<boolean>(false);
  const [faceSort, setFaceSort] = useState<"risk_desc" | "updated_desc" | "email_asc">(
    "risk_desc"
  );

  const refresh = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setRefreshing(true);
    setRefreshError("");
    const [snapshot, facePayload] = await Promise.all([
      getJSON<{
        users: AdminUser[];
        subscriptions: Subscription[];
        history: BillingRecord[];
        requests: ChangeRequest[];
        refunds: Refund[];
        scheduleAlerts: ScheduleAlert[];
      }>("/api/admin/snapshot"),
      getJSON<FaceLockPayload>("/api/admin/face-lock-mappings?take=1000"),
    ]);

    if (snapshot) {
      setUsers(snapshot.users ?? []);
      setSubscriptions(snapshot.subscriptions ?? []);
      setHistory(snapshot.history ?? []);
      setRequests(snapshot.requests ?? []);
      setRefunds(snapshot.refunds ?? []);
      setScheduleAlerts(snapshot.scheduleAlerts ?? []);
      setLastUpdated(new Date());
    }

    if (facePayload) {
      setFaceLockMappings(facePayload.mappings ?? []);
    }

    if (!snapshot && !facePayload) {
      setRefreshError("Live refresh failed. Retrying…");
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    if (retryRef.current) {
      window.clearTimeout(retryRef.current);
      retryRef.current = undefined;
    }
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }

    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      const interval = window.setInterval(() => {
        refresh({ silent: true });
      }, 15000);
      return () => window.clearInterval(interval);
    }

    let fallbackInterval: number | undefined;

    const connect = () => {
      if (!autoRefresh) return;
      setStreamStatus("connecting");
      const source = new EventSource("/api/admin/stream");
      streamRef.current = source;

      source.addEventListener("open", () => {
        setStreamStatus("connected");
        if (fallbackInterval) {
          window.clearInterval(fallbackInterval);
          fallbackInterval = undefined;
        }
      });

      source.addEventListener("error", () => {
        setStreamStatus("error");
        source.close();
        streamRef.current = null;
        if (!fallbackInterval) {
          fallbackInterval = window.setInterval(() => {
            refresh({ silent: true });
          }, 15000);
        }
        retryRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      });

      source.addEventListener("update", (event) => {
        try {
          const parsed = JSON.parse((event as MessageEvent).data || "{}");
          const type = parsed?.type as string;
          const userId = parsed?.userId as string | undefined;
          setLastUpdated(new Date());
          if (!type) return;
          switch (type) {
            case "user.updated": {
              if (userId) {
                patchUserLocal(userId, {
                  status: parsed.status ?? undefined,
                  credits: parsed.credits ?? undefined,
                  onboardingProfile:
                    parsed.allowEdit !== null && parsed.allowEdit !== undefined
                      ? { allowEdit: parsed.allowEdit }
                      : undefined,
                });
                if (selectedUser?.id === userId) {
                  patchSelectedUser({
                    status: parsed.status ?? undefined,
                    credits: parsed.credits ?? undefined,
                    onboardingProfile:
                      parsed.allowEdit !== null && parsed.allowEdit !== undefined
                        ? { allowEdit: parsed.allowEdit }
                        : undefined,
                  });
                }
              }
              break;
            }
            case "user.deleted": {
              if (userId) {
                setUsers((prev) => prev.filter((u) => u.id !== userId));
                setSubscriptions((prev) => prev.filter((s) => s.userId !== userId));
                setHistory((prev) => prev.filter((h) => h.userId !== userId));
                setRequests((prev) => prev.filter((r) => r.userId !== userId));
                setRefunds((prev) => prev.filter((r) => r.userId !== userId));
                if (selectedUser?.id === userId) {
                  setSelectedUser(null);
                }
              }
              break;
            }
            case "subscription.updated":
            case "subscription.status":
            case "subscription.cancelled": {
              if (userId) {
                patchUserLocal(userId, {
                  onboardingProfile: {
                    plan: parsed.plan ?? null,
                    billing: parsed.billing ?? null,
                    allowEdit: parsed.status === "Cancelled" ? true : undefined,
                    completedAt:
                      parsed.status === "Cancelled" ? null : new Date().toISOString(),
                  },
                });
                if (selectedUser?.id === userId) {
                  patchSelectedUser({
                    onboardingProfile: {
                      plan: parsed.plan ?? null,
                      billing: parsed.billing ?? null,
                      allowEdit: parsed.status === "Cancelled" ? true : undefined,
                      completedAt:
                        parsed.status === "Cancelled" ? null : new Date().toISOString(),
                    },
                  });
                }
              }
              if (parsed.subscription) {
                patchSubscriptionsList(parsed.subscription as Subscription);
              }
              if (parsed.history) {
                patchUserHistory(parsed.history as BillingRecord);
              }
              break;
            }
            case "credits.updated": {
              if (userId && typeof parsed.credits === "number") {
                patchUserLocal(userId, { credits: parsed.credits });
                if (selectedUser?.id === userId) {
                  patchSelectedUser({ credits: parsed.credits });
                }
              }
              if (parsed.history) {
                patchUserHistory(parsed.history as BillingRecord);
              }
              break;
            }
            case "notes.updated": {
              if (parsed.note) {
                patchUserNote(parsed.note as AdminNote);
              } else if (parsed.id) {
                removeUserNote(parsed.id as string);
              }
              break;
            }
            case "actions.updated": {
              if (parsed.action) {
                patchUserAction(parsed.action as AdminAction);
                const action = parsed.action as AdminAction;
                if (action.action.startsWith("schedule.exhausted.")) {
                  setScheduleAlerts((prev) => {
                    const next = [action as ScheduleAlert, ...prev];
                    return next.slice(0, 50);
                  });
                }
              }
              break;
            }
            case "schedule.updated": {
              if (parsed.post && selectedUser?.id) {
                const post = parsed.post as ScheduledPost;
                if (post.userId === selectedUser.id) {
                  setScheduledPosts((prev) => {
                    const next = prev.filter((p) => p.id !== post.id);
                    return [post, ...next].slice(0, 200);
                  });
                }
              }
              break;
            }
            case "refunds.updated": {
              if (parsed.refund) {
                const refund = parsed.refund as Refund;
                setRefunds((prev) =>
                  prev.map((r) => (r.id === refund.id ? refund : r))
                );
              }
              break;
            }
            case "requests.updated": {
              if (parsed.request) {
                const req = parsed.request as ChangeRequest;
                setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)));
              }
              break;
            }
            default: {
              refresh({ silent: true });
            }
          }
        } catch {
          refresh({ silent: true });
        }
      });
      source.addEventListener("ready", () => refresh({ silent: true }));
      source.addEventListener("ping", () => {
        // keepalive only
      });
    };

    connect();

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
        retryRef.current = undefined;
      }
      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
      }
    };
  }, [autoRefresh, selectedUser?.id]);

  const patchUserLocal = (userId: string, updates: Partial<AdminUser>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              ...updates,
              onboardingProfile: {
                ...u.onboardingProfile,
                ...(updates.onboardingProfile || {}),
              },
            }
          : u
      )
    );
  };

  const patchSelectedUser = (updates: Partial<AdminUser>) => {
    setSelectedUser((prev) =>
      prev
        ? {
            ...prev,
            ...updates,
            onboardingProfile: {
              ...prev.onboardingProfile,
              ...(updates.onboardingProfile || {}),
            },
          }
        : prev
    );
  };

  const patchUserHistory = (record?: BillingRecord) => {
    if (!record) return;
    setHistory((prev) =>
      [record, ...prev].filter((item, index, self) => self.findIndex((h) => h.id === item.id) === index).slice(0, 200)
    );
    setUserHistory((prev) =>
      [record, ...prev].filter((item, index, self) => self.findIndex((h) => h.id === item.id) === index).slice(0, 50)
    );
  };

  const patchUserAction = (action?: AdminAction) => {
    if (!action) return;
    setUserActions((prev) =>
      [action, ...prev].filter((item, index, self) => self.findIndex((a) => a.id === item.id) === index).slice(0, 50)
    );
  };

  const patchUserNote = (note?: AdminNote) => {
    if (!note) return;
    setUserNotes((prev) =>
      [note, ...prev].filter((item, index, self) => self.findIndex((n) => n.id === item.id) === index).slice(0, 50)
    );
  };

  const removeUserNote = (noteId?: string) => {
    if (!noteId) return;
    setUserNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const patchSubscriptionsList = (subscription?: Subscription) => {
    if (!subscription) return;
    setSubscriptions((prev) => {
      const exists = prev.find((s) => s.id === subscription.id);
      if (exists) {
        return prev.map((s) => (s.id === subscription.id ? { ...s, ...subscription } : s));
      }
      return [subscription, ...prev].slice(0, 200);
    });
  };

  const quickUpdateUser = async (
    userId: string,
    payload: { status?: string; allowEdit?: boolean }
  ) => {
    await postJSON("/api/admin/user", {
      userId,
      ...payload,
    });
    patchUserLocal(userId, {
      status: payload.status,
      onboardingProfile:
        typeof payload.allowEdit === "boolean"
          ? { allowEdit: payload.allowEdit }
          : undefined,
    });
    if (selectedUser?.id === userId) {
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status ?? prev.status,
              onboardingProfile:
                typeof payload.allowEdit === "boolean"
                  ? {
                      ...prev.onboardingProfile,
                      allowEdit: payload.allowEdit,
                    }
                  : prev.onboardingProfile,
            }
          : prev
      );
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    const confirmDelete = window.confirm(
      `Delete ${selectedUser.email || "this user"}? This cannot be undone.`
    );
    if (!confirmDelete) return;
    await fetch(`/api/admin/user?userId=${encodeURIComponent(selectedUser.id)}`, {
      method: "DELETE",
    });
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    setSubscriptions((prev) => prev.filter((s) => s.userId !== selectedUser.id));
    setHistory((prev) => prev.filter((h) => h.userId !== selectedUser.id));
    setRequests((prev) => prev.filter((r) => r.userId !== selectedUser.id));
    setRefunds((prev) => prev.filter((r) => r.userId !== selectedUser.id));
    setSelectedUser(null);
  };

  const totals = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.status === "Active").length;
    const openRequests = requests.filter((r) => r.status === "pending").length;
    const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
    return { activeSubs, openRequests, totalCredits, users: users.length };
  }, [subscriptions, requests, users]);

  const faceCoverage = useMemo(() => {
    const total = faceLockMappings.length;
    const mapped = faceLockMappings.filter((m) => m.mappingStatus === "mapped").length;
    const unmapped = total - mapped;
    const pct = total ? Math.round((mapped / total) * 100) : 0;
    return { total, mapped, unmapped, pct };
  }, [faceLockMappings]);

  const faceInfluencerOptions = useMemo(() => {
    const items = Array.from(
      new Set(
        faceLockMappings
          .map((m) => (m.influencerId || "").trim())
          .filter((id) => Boolean(id))
      )
    ).sort();
    return items;
  }, [faceLockMappings]);

  const activeSubscriptionsByUser = useMemo(() => {
    const map = new Map<string, Subscription>();
    subscriptions
      .filter((s) => s.status === "Active")
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .forEach((sub) => {
        if (!map.has(sub.userId)) map.set(sub.userId, sub);
      });
    return map;
  }, [subscriptions]);

  const faceLockRows = useMemo(() => {
    const rows = faceLockMappings.map((m) => {
      const activeSub = activeSubscriptionsByUser.get(m.userId);
      const hasFace = Boolean(m.faceSrc);
      const isMapped = m.mappingStatus === "mapped";
      const riskScore = !isMapped ? 100 : !hasFace ? 85 : 0;
      const riskLabel = riskScore >= 80 ? "critical" : riskScore >= 40 ? "warning" : "healthy";
      return {
        ...m,
        activePlan: activeSub?.plan || null,
        activeBilling: activeSub?.billing || null,
        riskScore,
        riskLabel,
      };
    });

    return rows;
  }, [faceLockMappings, activeSubscriptionsByUser]);

  const filteredFaceLockRows = useMemo(() => {
    const q = faceSearch.trim().toLowerCase();
    const rows = faceLockRows.filter((row) => {
      if (faceStatusFilter !== "all" && row.mappingStatus !== faceStatusFilter) return false;
      if (faceInfluencerFilter !== "all" && (row.influencerId || "") !== faceInfluencerFilter) {
        return false;
      }
      if (faceOnlyPrimaryRequired && !row.primaryFaceRequired) return false;
      if (!q) return true;
      return [
        row.email || "",
        row.name || "",
        row.userId || "",
        row.influencerId || "",
        row.influencerName || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sorted = [...rows].sort((a, b) => {
      if (faceSort === "risk_desc") {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
        return String(a.email || a.userId).localeCompare(String(b.email || b.userId));
      }
      if (faceSort === "updated_desc") {
        const aTime = new Date(a.onboardingUpdatedAt || a.createdAt).getTime();
        const bTime = new Date(b.onboardingUpdatedAt || b.createdAt).getTime();
        return bTime - aTime;
      }
      return String(a.email || a.userId).localeCompare(String(b.email || b.userId));
    });

    return sorted;
  }, [
    faceLockRows,
    faceSearch,
    faceStatusFilter,
    faceInfluencerFilter,
    faceOnlyPrimaryRequired,
    faceSort,
  ]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const activeSub = activeSubscriptionsByUser.get(u.id);
      const plan = String(activeSub?.plan || "").toLowerCase();
      const billing = String(activeSub?.billing || "").toLowerCase();
      const status = String(u.status || "").toLowerCase();
      const locked = u.onboardingProfile?.allowEdit ? "unlocked" : "locked";

      if (filterPlan !== "all" && plan !== filterPlan) return false;
      if (filterBilling !== "all" && billing !== filterBilling) return false;
      if (filterStatus !== "all" && status !== filterStatus) return false;
      if (filterLock !== "all" && locked !== filterLock) return false;

      if (!q) return true;
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || u.id.toLowerCase().includes(q);
    });
  }, [users, search, filterPlan, filterBilling, filterStatus, filterLock, activeSubscriptionsByUser]);

  const userEmailById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.id && u.email) map.set(u.id, u.email);
    });
    return map;
  }, [users]);

  const openUser = (user: AdminUser) => {
    setSelectedUser(user);
    setAdminTab("profile");
    setEditStatus(user.status || "Active");
    setEditCredits(String(user.credits ?? 0));
    setEditAllowEdit(Boolean(user.onboardingProfile?.allowEdit));
    const activeSub = activeSubscriptionsByUser.get(user.id);
    setEditPlan(String(activeSub?.plan || user.onboardingProfile?.plan || "pro").toLowerCase());
    setEditBilling(
      String(activeSub?.billing || user.onboardingProfile?.billing || "monthly").toLowerCase()
    );
    setPlanReason("");
    setCreditDelta("0");
    setCreditReason("");
    setNoteInput("");
    setUserNotes([]);
    setUserActions([]);
    setUserHistory([]);

    getJSON<{ notes: AdminNote[] }>(`/api/admin/notes?userId=${user.id}`).then((data) => {
      setUserNotes(data?.notes ?? []);
    });
    getJSON<{ actions: AdminAction[] }>(`/api/admin/actions?userId=${user.id}`).then((data) => {
      setUserActions(data?.actions ?? []);
    });
    getJSON<{ history: BillingRecord[] }>(`/api/admin/billing-history?userId=${user.id}`).then((data) => {
      setUserHistory(data?.history ?? []);
    });
    getJSON<{ items: ScheduledPost[] }>(
      `/api/admin/scheduled-posts?userId=${user.id}`
    ).then((data) => {
      setScheduledPosts(data?.items ?? []);
    });
    getJSON<{ items: ScheduleOverride[] }>(
      `/api/admin/schedule-overrides?userId=${user.id}`
    ).then((data) => {
      setScheduleOverrides(data?.items ?? []);
    });
  };

  const refreshSchedules = async () => {
    if (!selectedUser?.id) return;
    const influencerParam = scheduleInfluencerId
      ? `&influencerId=${encodeURIComponent(scheduleInfluencerId)}`
      : "";
    const [posts, overrides] = await Promise.all([
      getJSON<{ items: ScheduledPost[] }>(
        `/api/admin/scheduled-posts?userId=${selectedUser.id}${influencerParam}`
      ),
      getJSON<{ items: ScheduleOverride[] }>(
        `/api/admin/schedule-overrides?userId=${selectedUser.id}${influencerParam}`
      ),
    ]);
    setScheduledPosts(posts?.items ?? []);
    setScheduleOverrides(overrides?.items ?? []);
  };

  const applyScheduleOverride = async () => {
    if (!selectedUser?.id) return;
    await postJSON("/api/admin/schedule-overrides", {
      userId: selectedUser.id,
      influencerId: scheduleInfluencerId || null,
      disabled: overrideDisabled,
      paused: overridePaused,
      overrideDaily,
      overrideMonthly,
      overrideTime: overrideTime || null,
      overrideTimeZone: overrideTimeZone || null,
      reason: overrideReason || null,
    });
    await refreshSchedules();
  };

  const cancelScheduledPost = async (postId: string) => {
    await fetch("/api/admin/scheduled-posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, reason: "Admin cancelled" }),
    });
    await refreshSchedules();
  };

  const reschedulePost = async (post: ScheduledPost) => {
    const draft = rescheduleDrafts[post.id];
    const baseDate = new Date(post.scheduleDate);
    const date = draft?.date || baseDate.toISOString().slice(0, 10);
    const time = draft?.time || post.time;
    const scheduleDate = new Date(`${date}T00:00:00.000Z`).toISOString();
    await fetch("/api/admin/scheduled-posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, scheduleDate, time }),
    });
    await refreshSchedules();
  };

  const bulkReschedule = async () => {
    if (!selectedUser?.id) return;
    await fetch("/api/admin/scheduled-posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulk: true,
        userId: selectedUser.id,
        influencerId: scheduleInfluencerId || null,
        shiftDays: Number(bulkShiftDays || 0),
        setTime: bulkSetTime || null,
      }),
    });
    await refreshSchedules();
  };

  const bulkCancelSchedules = async () => {
    if (!selectedUser?.id) return;
    await fetch("/api/admin/scheduled-posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulk: true,
        userId: selectedUser.id,
        influencerId: scheduleInfluencerId || null,
        reason: bulkCancelReason || "Admin bulk cancel",
      }),
    });
    await refreshSchedules();
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    await postJSON("/api/admin/user", {
      userId: selectedUser.id,
      status: editStatus,
      credits: Number(editCredits || 0),
      allowEdit: editAllowEdit,
    });
    await refresh();
  };

  const applyPlan = async () => {
    if (!selectedUser) return;
    await postJSON("/api/admin/subscriptions", {
      userId: selectedUser.id,
      plan: editPlan,
      billing: editBilling,
      action: "set",
    });
    if (planReason.trim()) {
      await postJSON("/api/admin/actions", {
        userId: selectedUser.id,
        action: "plan_change",
        detail: planReason.trim(),
      });
    }
    setSelectedUser((prev) =>
      prev
        ? {
            ...prev,
            onboardingProfile: {
              ...prev.onboardingProfile,
              plan: editPlan,
              billing: editBilling,
              allowEdit: false,
              completedAt: new Date().toISOString(),
            },
          }
        : prev
    );
    await refresh();
    if (selectedUser) openUser(selectedUser);
  };

  const cancelPlan = async () => {
    if (!selectedUser) return;
    await postJSON("/api/admin/subscriptions", {
      userId: selectedUser.id,
      action: "cancel",
    });
    if (planReason.trim()) {
      await postJSON("/api/admin/actions", {
        userId: selectedUser.id,
        action: "plan_cancel",
        detail: planReason.trim(),
      });
    }
    setSelectedUser((prev) =>
      prev
        ? {
            ...prev,
            onboardingProfile: {
              ...prev.onboardingProfile,
              plan: null,
              billing: null,
              allowEdit: true,
              completedAt: null,
            },
          }
        : prev
    );
    await refresh();
    if (selectedUser) openUser(selectedUser);
  };

  const grantCredits = async () => {
    if (!selectedUser) return;
    const delta = Number(creditDelta || 0);
    if (!Number.isFinite(delta) || delta === 0) return;
    await postJSON("/api/admin/credits", {
      userId: selectedUser.id,
      delta,
      reason: creditReason.trim(),
    });
    setSelectedUser((prev) =>
      prev ? { ...prev, credits: (prev.credits || 0) + delta } : prev
    );
    await refresh();
    if (selectedUser) openUser(selectedUser);
  };

  const addNote = async () => {
    if (!selectedUser || !noteInput.trim()) return;
    await postJSON("/api/admin/notes", {
      userId: selectedUser.id,
      note: noteInput.trim(),
    });
    setNoteInput("");
    const data = await getJSON<{ notes: AdminNote[] }>(`/api/admin/notes?userId=${selectedUser.id}`);
    setUserNotes(data?.notes ?? []);
  };

  const deleteNote = async (id: string) => {
    if (!selectedUser) return;
    await fetch(`/api/admin/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await getJSON<{ notes: AdminNote[] }>(`/api/admin/notes?userId=${selectedUser.id}`);
    setUserNotes(data?.notes ?? []);
  };

  const updateRequestStatus = async (id: string, status: string) => {
    await postJSON("/api/admin/onboarding-requests", { id, status });
    await refresh();
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    await postJSON("/api/admin/subscriptions", { id, status });
    await refresh();
    if (selectedUser) openUser(selectedUser);
  };

  const updateRefundStatus = async (id: string, status: string) => {
    await postJSON("/api/admin/refunds", { id, status });
    await refresh();
  };

  const impersonate = async (userId: string) => {
    await postJSON("/api/admin/impersonate", { userId });
    window.location.href = "/playground";
  };

  const stopImpersonation = async () => {
    await postJSON("/api/admin/impersonate/stop", {});
    window.location.href = "/admin";
  };

  const exportFaceLockCsv = () => {
    const headers = [
      "user_id",
      "email",
      "name",
      "mapping_status",
      "influencer_id",
      "influencer_name",
      "face_src",
      "lock_mode",
      "primary_face_required",
      "active_plan",
      "active_billing",
      "risk_score",
      "risk_label",
      "created_at",
      "onboarding_updated_at",
    ];

    const escapeCell = (value: unknown) => {
      const raw = String(value ?? "");
      return `"${raw.replace(/"/g, '""')}"`;
    };

    const lines = filteredFaceLockRows.map((row) =>
      [
        row.userId,
        row.email || "",
        row.name || "",
        row.mappingStatus,
        row.influencerId || "",
        row.influencerName || "",
        row.faceSrc || "",
        row.lockMode || "",
        String(Boolean(row.primaryFaceRequired)),
        row.activePlan || "",
        row.activeBilling || "",
        String(row.riskScore),
        row.riskLabel,
        row.createdAt,
        row.onboardingUpdatedAt || "",
      ]
        .map(escapeCell)
        .join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `face-lock-audit-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runFaceLockFix = async (row: FaceLockMapping & { riskScore: number; riskLabel: string }) => {
    const user = users.find((u) => u.id === row.userId);
    if (!user) {
      await refresh({ silent: true });
      return;
    }

    if (row.mappingStatus !== "mapped") {
      await quickUpdateUser(row.userId, { allowEdit: true });
    }

    openUser(user);
    setAdminTab("profile");
  };

  return (
    <main className="min-h-screen bg-[#0b0b12] text-white">
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-indigo-500/10 blur-[140px]" />
          <div className="absolute top-40 left-0 h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Admin Control</p>
              <h1 className="mt-2 text-3xl font-semibold text-white/95">Studio Operations Console</h1>
              <p className="mt-2 text-sm text-white/60">
                Secure command center for plans, billing, credits, and creator setup.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Audit-ready</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Role-gated</span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                  Live control
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`rounded-full border px-4 py-2 text-sm ${
                autoRefresh
                  ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              {autoRefresh ? "Live updates on" : "Live updates off"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                window.location.href = "/";
              }}
              className="rounded-full border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/20"
            >
              logout
            </button>
            <button
              type="button"
              onClick={stopImpersonation}
              className="rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
            >
              Exit impersonation
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/50">
          <span>Realtime admin control</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for refresh"}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>
            Stream:{" "}
            {streamStatus === "connected"
              ? "Live"
              : streamStatus === "connecting"
                ? "Connecting"
                : streamStatus === "error"
                  ? "Disconnected"
                  : "Idle"}
          </span>
          {refreshError && <span className="text-amber-200/80">{refreshError}</span>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs text-white/50">Users</p>
            <p className="mt-2 text-2xl font-semibold">{totals.users}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs text-white/50">Active subscriptions</p>
            <p className="mt-2 text-2xl font-semibold">{totals.activeSubs}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs text-white/50">Open change requests</p>
            <p className="mt-2 text-2xl font-semibold">{totals.openRequests}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <p className="text-xs text-white/50">Total credits</p>
            <p className="mt-2 text-2xl font-semibold">{totals.totalCredits}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-500/[0.05] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">Face Lock Audit</p>
              <p className="mt-2 text-sm text-cyan-100/85">
                Backend-enforced primary face mapping per user for Nano Banana generation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100/90">
                Coverage {faceCoverage.pct}%
              </span>
              <button
                type="button"
                onClick={exportFaceLockCsv}
                className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-3 py-1 text-[11px] text-cyan-100"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[11px] text-cyan-100/60">Users audited</p>
              <p className="mt-1 text-lg font-semibold text-white">{faceCoverage.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
              <p className="text-[11px] text-emerald-100/70">Mapped</p>
              <p className="mt-1 text-lg font-semibold text-emerald-100">{faceCoverage.mapped}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
              <p className="text-[11px] text-amber-100/70">Unmapped</p>
              <p className="mt-1 text-lg font-semibold text-amber-100">{faceCoverage.unmapped}</p>
            </div>
            <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3">
              <p className="text-[11px] text-rose-100/70">Critical risk</p>
              <p className="mt-1 text-lg font-semibold text-rose-100">
                {faceLockRows.filter((row) => row.riskLabel === "critical").length}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
            <input
              value={faceSearch}
              onChange={(e) => setFaceSearch(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
              placeholder="Search user, email, influencer"
            />
            <select
              value={faceStatusFilter}
              onChange={(e) => setFaceStatusFilter(e.target.value as "all" | "mapped" | "unmapped")}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
            >
              <option value="all" className="bg-black">All mapping</option>
              <option value="mapped" className="bg-black">Mapped</option>
              <option value="unmapped" className="bg-black">Unmapped</option>
            </select>
            <select
              value={faceInfluencerFilter}
              onChange={(e) => setFaceInfluencerFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
            >
              <option value="all" className="bg-black">All influencers</option>
              {faceInfluencerOptions.map((id) => (
                <option key={id} value={id} className="bg-black">
                  {id}
                </option>
              ))}
            </select>
            <select
              value={faceSort}
              onChange={(e) =>
                setFaceSort(e.target.value as "risk_desc" | "updated_desc" | "email_asc")
              }
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
            >
              <option value="risk_desc" className="bg-black">Risk first</option>
              <option value="updated_desc" className="bg-black">Recently updated</option>
              <option value="email_asc" className="bg-black">Email A-Z</option>
            </select>
            <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={faceOnlyPrimaryRequired}
                onChange={(e) => setFaceOnlyPrimaryRequired(e.target.checked)}
              />
              Primary required only
            </label>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[11px] uppercase text-cyan-100/50">
                <tr>
                  <th className="py-2 pr-3">Risk</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Mapping</th>
                  <th className="py-2 pr-3">Influencer</th>
                  <th className="py-2 pr-3">Face source</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredFaceLockRows.slice(0, 300).map((row) => (
                  <tr key={row.userId}>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${
                          row.riskLabel === "critical"
                            ? "border-rose-300/40 bg-rose-500/15 text-rose-100"
                            : row.riskLabel === "warning"
                              ? "border-amber-300/40 bg-amber-500/15 text-amber-100"
                              : "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
                        }`}
                      >
                        {row.riskLabel} ({row.riskScore})
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-white">{row.email || row.userId}</p>
                      <p className="text-[10px] text-white/45">{row.userId}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${
                          row.mappingStatus === "mapped"
                            ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
                            : "border-amber-300/40 bg-amber-500/15 text-amber-100"
                        }`}
                      >
                        {row.mappingStatus}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <p>{row.influencerName || row.influencerId || "—"}</p>
                      <p className="text-[10px] text-white/45">{row.influencerId || "unassigned"}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <p className="max-w-[240px] truncate text-[11px]">{row.faceSrc || "—"}</p>
                    </td>
                    <td className="py-2 pr-3 text-[11px]">
                      {row.activePlan || "—"} {row.activeBilling ? `• ${row.activeBilling}` : ""}
                    </td>
                    <td className="py-2 text-[11px] text-white/55">
                      {new Date(row.onboardingUpdatedAt || row.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => runFaceLockFix(row)}
                        className={`rounded-full border px-3 py-1 text-[11px] ${
                          row.mappingStatus === "mapped"
                            ? "border-white/20 bg-white/10 text-white/80"
                            : "border-amber-300/40 bg-amber-500/15 text-amber-100"
                        }`}
                      >
                        {row.mappingStatus === "mapped" ? "Review" : "Fix now"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredFaceLockRows.length && !loading && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-white/50">
                      No face lock mappings match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredFaceLockRows.length > 300 && (
            <p className="mt-3 text-[11px] text-cyan-100/65">
              Showing first 300 rows. Narrow filters or export CSV for full dataset.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-500/5 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Schedule alerts</p>
              <p className="mt-2 text-sm text-amber-100/80">
                Influencers that have run out of scheduled posts.
              </p>
            </div>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100/80">
              {scheduleAlerts.length} active
            </span>
          </div>
          <div className="mt-4 space-y-2 text-xs text-amber-100/80">
            {scheduleAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-amber-300/20 bg-black/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-100/90">{alert.action}</span>
                  <span className="text-[10px] text-amber-100/50">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-amber-100/70">
                  {alert.detail || "Scheduling pool exhausted."}
                </p>
                {alert.user?.email && (
                  <p className="mt-1 text-[10px] text-amber-100/50">
                    User: {alert.user.email}
                  </p>
                )}
              </div>
            ))}
            {!scheduleAlerts.length && (
              <div className="rounded-lg border border-amber-300/20 bg-black/30 px-3 py-2 text-[11px] text-amber-100/60">
                No schedule alerts yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="mt-1 text-xs text-white/45">Manage access, billing, credits, and security controls.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                Advanced controls
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                placeholder="Search by email, name, or ID"
              />
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
              >
                <option value="all" className="bg-black">All plans</option>
                {PLAN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-black">
                    {opt}
                  </option>
                ))}
              </select>
              <select
                value={filterBilling}
                onChange={(e) => setFilterBilling(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
              >
                <option value="all" className="bg-black">All billing</option>
                {BILLING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-black">
                    {opt}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
              >
                <option value="all" className="bg-black">All status</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt.toLowerCase()} className="bg-black">
                    {opt}
                  </option>
                ))}
              </select>
              <select
                value={filterLock}
                onChange={(e) => setFilterLock(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
              >
                <option value="all" className="bg-black">All access</option>
                <option value="locked" className="bg-black">Locked</option>
                <option value="unlocked" className="bg-black">Unlocked</option>
              </select>
            </div>
            <div className="mt-4 space-y-3 lg:hidden">
              {filteredUsers.map((u) => (
                <div key={u.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{u.name || u.email || "Unknown"}</p>
                      <p className="text-xs text-white/50">{u.email || u.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openUser(u)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => impersonate(u.id)}
                        className="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-1 text-xs text-white/90"
                      >
                        Impersonate
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Plan</p>
                      <p className="text-xs text-white/80">
                        {activeSubscriptionsByUser.get(u.id)?.plan || "—"} •{" "}
                        {activeSubscriptionsByUser.get(u.id)?.billing || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Credits</p>
                      <p className="text-xs text-white/80">{u.credits ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Status</p>
                      <select
                        value={u.status || "Active"}
                        onChange={(e) => quickUpdateUser(u.id, { status: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-black">
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Access</p>
                      <button
                        type="button"
                        onClick={() =>
                          quickUpdateUser(u.id, { allowEdit: !u.onboardingProfile?.allowEdit })
                        }
                        className={`mt-1 w-full rounded-lg border px-2 py-1 text-xs ${
                          u.onboardingProfile?.allowEdit
                            ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                            : "border-rose-300/40 bg-rose-500/10 text-rose-100"
                        }`}
                      >
                        {u.onboardingProfile?.allowEdit ? "Lock setup" : "Unlock setup"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!filteredUsers.length && !loading && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/50">
                  No matching users found.
                </div>
              )}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm hidden lg:table">
                <thead className="text-xs uppercase text-white/40">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Credits</th>
                    <th className="py-2">Setup lock</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="text-white/80">
                      <td className="py-3">
                        <div className="font-medium text-white">
                          {u.name || u.email || "Unknown"}
                        </div>
                        <div className="text-xs text-white/50">{u.email}</div>
                      </td>
                      <td className="py-3 text-xs">
                        {activeSubscriptionsByUser.get(u.id)?.plan || "—"} •{" "}
                        {activeSubscriptionsByUser.get(u.id)?.billing || "—"}
                      </td>
                      <td className="py-3">{u.credits ?? 0}</td>
                      <td className="py-3 text-xs">
                        {u.onboardingProfile?.allowEdit ? "Unlocked" : "Locked"}
                      </td>
                      <td className="py-3 text-xs">{u.status || "Active"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={u.status || "Active"}
                            onChange={(e) => quickUpdateUser(u.id, { status: e.target.value })}
                            className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/70"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-black">
                                {opt}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              quickUpdateUser(u.id, { allowEdit: !u.onboardingProfile?.allowEdit })
                            }
                            className={`rounded-full border px-3 py-1 text-[11px] ${
                              u.onboardingProfile?.allowEdit
                                ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                                : "border-rose-300/40 bg-rose-500/10 text-rose-100"
                            }`}
                          >
                            {u.onboardingProfile?.allowEdit ? "Lock setup" : "Unlock setup"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openUser(u)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                          >
                            Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => impersonate(u.id)}
                            className="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-1 text-xs text-white/90 hover:bg-indigo-500/30"
                          >
                            Impersonate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredUsers.length && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-white/50">
                        No matching users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Change requests</h2>
                <p className="mt-1 text-xs text-white/50">Approve creator studio change requests.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                SLA queue
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white/85">
                      {userEmailById.get(r.userId) || r.userId}
                    </span>
                    <span className="text-white/40">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-white/70">{r.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {["pending", "reviewing", "approved", "rejected", "completed"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateRequestStatus(r.id, s)}
                        className={`rounded-full border px-3 py-1 text-[11px] transition ${
                          r.status === s
                            ? "border-indigo-300/40 bg-indigo-500/20 text-white"
                            : "border-white/10 bg-black/40 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!requests.length && !loading && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/50">
                  No change requests.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <h2 className="text-lg font-semibold">Subscriptions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-white/40">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Next charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="text-white/80">
                      <td className="py-3 text-xs">{s.userId}</td>
                      <td className="py-3 text-xs">{s.plan} • {s.billing}</td>
                      <td className="py-3">
                        <select
                          value={s.status}
                          onChange={(e) => updateSubscriptionStatus(s.id, e.target.value)}
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70"
                        >
                          {["Active", "Past due", "Cancelled"].map((opt) => (
                            <option key={opt} value={opt} className="bg-black">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-xs">
                        {s.nextChargeAt ? new Date(s.nextChargeAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {!subscriptions.length && !loading && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-white/50">
                        No subscriptions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <h2 className="text-lg font-semibold">Billing history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-white/40">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((h) => (
                    <tr key={h.id} className="text-white/80">
                      <td className="py-3 text-xs">{h.user?.email || h.userId}</td>
                      <td className="py-3 text-xs">{h.plan || "—"} • {h.billing || "—"}</td>
                      <td className="py-3 text-xs">${(h.amount / 100).toFixed(2)}</td>
                      <td className="py-3 text-xs">{h.status || "succeeded"}</td>
                    </tr>
                  ))}
                  {!history.length && !loading && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-white/50">
                        No billing history.
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
          <h2 className="text-lg font-semibold">Refund requests</h2>
          <p className="mt-1 text-xs text-white/50">Approve or reject refund requests.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-white/40">
                <tr>
                  <th className="py-2">User</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {refunds.map((r) => (
                  <tr key={r.id} className="text-white/80">
                    <td className="py-3 text-xs">{r.userId}</td>
                    <td className="py-3 text-xs">${(r.amount / 100).toFixed(2)}</td>
                    <td className="py-3 text-xs">{r.reason || "—"}</td>
                    <td className="py-3">
                      <select
                        value={r.status}
                        onChange={(e) => updateRefundStatus(r.id, e.target.value)}
                        className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70"
                      >
                        {["Pending", "Approved", "Rejected"].map((opt) => (
                          <option key={opt} value={opt} className="bg-black">
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-xs">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {!refunds.length && !loading && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-white/50">
                      No refund requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
          <div className="absolute left-1/2 top-1/2 w-[94vw] max-w-[900px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1018] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
            <div className="max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Manage user</p>
                <h3 className="mt-2 text-xl font-semibold">{selectedUser.email}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["profile", "scheduling"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAdminTab(tab)}
                  className={`rounded-full border px-4 py-1.5 text-xs transition ${
                    adminTab === tab
                      ? "border-indigo-300/40 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {tab === "profile" ? "Profile" : "Scheduling"}
                </button>
              ))}
            </div>

            <div className={adminTab === "profile" ? "block" : "hidden"}>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">User status</p>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-black">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Credits</p>
                <input
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  type="number"
                  min={0}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Creator setup</p>
                <select
                  value={editAllowEdit ? "unlocked" : "locked"}
                  onChange={(e) => setEditAllowEdit(e.target.value === "unlocked")}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                >
                  <option value="locked" className="bg-black">Locked</option>
                  <option value="unlocked" className="bg-black">Unlocked</option>
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Plan + billing</p>
                <div className="mt-2 flex gap-2">
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  >
                    {PLAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-black">
                        {opt}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editBilling}
                    onChange={(e) => setEditBilling(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  >
                    {BILLING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-black">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            </div>

            {adminTab === "scheduling" && (
            <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Scheduling controls</p>
                <button
                  type="button"
                  onClick={refreshSchedules}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70"
                >
                  Refresh
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={scheduleInfluencerId}
                  onChange={(e) => setScheduleInfluencerId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Influencer ID (optional)"
                />
                <input
                  value={overrideTimeZone}
                  onChange={(e) => setOverrideTimeZone(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Override time zone (e.g. America/New_York)"
                />
                <input
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Override time (HH:MM)"
                />
                <input
                  value={overrideDaily}
                  onChange={(e) => setOverrideDaily(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Override daily quota"
                />
                <input
                  value={overrideMonthly}
                  onChange={(e) => setOverrideMonthly(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Override monthly quota"
                />
                <input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                  placeholder="Reason"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overrideDisabled}
                    onChange={(e) => setOverrideDisabled(e.target.checked)}
                  />
                  Disable scheduling
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overridePaused}
                    onChange={(e) => setOverridePaused(e.target.checked)}
                  />
                  Pause new scheduling
                </label>
                <button
                  type="button"
                  onClick={applyScheduleOverride}
                  className="rounded-full border border-indigo-300/30 bg-indigo-500/15 px-3 py-1 text-[11px] text-indigo-100"
                >
                  Apply override
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
                <input
                  value={bulkShiftDays}
                  onChange={(e) => setBulkShiftDays(e.target.value)}
                  className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                  placeholder="Shift days"
                />
                <input
                  value={bulkSetTime}
                  onChange={(e) => setBulkSetTime(e.target.value)}
                  className="w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                  placeholder="Set time"
                />
                <input
                  value={bulkCancelReason}
                  onChange={(e) => setBulkCancelReason(e.target.value)}
                  className="min-w-[180px] rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                  placeholder="Bulk cancel reason"
                />
                <button
                  type="button"
                  onClick={bulkReschedule}
                  className="rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1 text-[11px] text-amber-100"
                >
                  Bulk reschedule
                </button>
                <button
                  type="button"
                  onClick={bulkCancelSchedules}
                  className="rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1 text-[11px] text-rose-100"
                >
                  Bulk cancel
                </button>
              </div>
              <div className="mt-4 space-y-2 text-xs text-white/70">
                {scheduleOverrides.map((override) => (
                  <div key={override.id} className="rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80">
                        {override.influencerId || "All influencers"}
                      </span>
                      <span className="text-[10px] text-white/45">
                        {new Date(override.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/55">
                      {override.disabled ? "Disabled" : override.paused ? "Paused" : "Active"} •
                      Daily: {override.overrideDaily ?? "—"} • Monthly: {override.overrideMonthly ?? "—"}
                    </p>
                  </div>
                ))}
                {!scheduleOverrides.length && (
                  <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-white/45">
                    No overrides yet.
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2 text-xs text-white/70">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                    <div>
                      <p className="text-white/85">{post.influencerId}</p>
                      <p className="text-[10px] text-white/45">
                        {new Date(post.scheduleDate).toLocaleString()} • {post.time} • {post.status}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={
                            rescheduleDrafts[post.id]?.date ||
                            new Date(post.scheduleDate).toISOString().slice(0, 10)
                          }
                          onChange={(e) =>
                            setRescheduleDrafts((prev) => ({
                              ...prev,
                              [post.id]: {
                                date: e.target.value,
                                time: prev[post.id]?.time || post.time,
                              },
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                        />
                        <input
                          type="time"
                          value={rescheduleDrafts[post.id]?.time || post.time}
                          onChange={(e) =>
                            setRescheduleDrafts((prev) => ({
                              ...prev,
                              [post.id]: {
                                date:
                                  prev[post.id]?.date ||
                                  new Date(post.scheduleDate).toISOString().slice(0, 10),
                                time: e.target.value,
                              },
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80"
                        />
                        <button
                          type="button"
                          onClick={() => reschedulePost(post)}
                          className="rounded-full border border-indigo-300/30 bg-indigo-500/15 px-2.5 py-1 text-[10px] text-indigo-100"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelScheduledPost(post.id)}
                      className="rounded-full border border-rose-300/30 bg-rose-500/15 px-2.5 py-1 text-[10px] text-rose-100"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
                {!scheduledPosts.length && (
                  <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-white/45">
                    No scheduled posts found.
                  </div>
                )}
              </div>
            </div>
            )}

            <div className={adminTab === "profile" ? "block" : "hidden"}>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs text-white/50">Plan change reason (optional)</p>
              <input
                value={planReason}
                onChange={(e) => setPlanReason(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                placeholder="e.g., VIP override, support escalation, promo extension"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Manual credit adjustment</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={creditDelta}
                    onChange={(e) => setCreditDelta(e.target.value)}
                    type="number"
                    className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                    placeholder="+500"
                  />
                  <input
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                    placeholder="Reason for credit change"
                  />
                </div>
                <button
                  type="button"
                  onClick={grantCredits}
                  className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  Apply credits
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Admin notes</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80"
                    placeholder="Add internal note"
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    className="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-xs text-white/90"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-xs text-white/70">
                  {userNotes.map((n) => (
                    <div key={n.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                      <div>
                        <p className="text-white/85">{n.note}</p>
                        <p className="mt-1 text-[10px] text-white/45">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteNote(n.id)}
                        className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/60 hover:bg-black/50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {!userNotes.length && (
                    <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-white/45">
                      No notes yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">Recent admin actions</p>
                <div className="mt-3 space-y-2 text-xs text-white/70">
                  {userActions.map((a) => (
                    <div key={a.id} className="rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">{a.action}</span>
                        <span className="text-[10px] text-white/45">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {a.detail && <p className="mt-1 text-[11px] text-white/55">{a.detail}</p>}
                    </div>
                  ))}
                  {!userActions.length && (
                    <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-white/45">
                      No actions logged.
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/50">User billing history</p>
                <div className="mt-3 space-y-2 text-xs text-white/70">
                  {userHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">{h.plan || "plan"} • {h.billing || "billing"}</span>
                        <span className="text-[10px] text-white/45">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-white/55">
                        ${(h.amount / 100).toFixed(2)} • {h.status || "succeeded"}
                      </p>
                    </div>
                  ))}
                  {!userHistory.length && (
                    <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-white/45">
                      No billing history.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-white/55">
                Update user status, credits, plan, or lock/unlock creator setup.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={deleteUser}
                  className="rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-xs text-rose-100 hover:bg-rose-500/25"
                >
                  Delete user
                </button>
                <button
                  type="button"
                  onClick={saveUser}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  Save user
                </button>
                <button
                  type="button"
                  onClick={applyPlan}
                  className="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-xs text-white/90 hover:bg-indigo-500/30"
                >
                  Apply plan
                </button>
                <button
                  type="button"
                  onClick={cancelPlan}
                  className="rounded-full border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-xs text-white/90 hover:bg-rose-500/30"
                >
                  Cancel plan
                </button>
              </div>
            </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
