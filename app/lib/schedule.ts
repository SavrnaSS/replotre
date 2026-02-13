type PlanKey = "basic" | "pro" | "elite";

type PlanSchedule = {
  label: string;
  times: string[];
};

type BuildScheduleParams = {
  plan: string;
  monthlyQuota: number;
  startDate: Date;
  days: number;
  images: string[];
  title: string;
  creator?: string;
};

export type ScheduleItem = {
  id: string;
  time: string;
  label: string;
  title: string;
  src: string;
  dateKey: string;
  creator?: string;
};

const PLAN_SCHEDULE: Record<PlanKey, PlanSchedule> = {
  basic: {
    label: "Alternate-day cadence",
    times: ["11:30 AM", "7:00 PM"],
  },
  pro: {
    label: "Daily cadence",
    times: ["10:00 AM", "6:00 PM"],
  },
  elite: {
    label: "High-frequency cadence",
    times: [
      "8:00 AM",
      "10:30 AM",
      "1:00 PM",
      "3:30 PM",
      "6:00 PM",
      "8:30 PM",
    ],
  },
};

export const getPlanSchedule = (plan: string) =>
  PLAN_SCHEDULE[(plan || "basic") as PlanKey] || PLAN_SCHEDULE.basic;

export const getMonthlyQuota = (plan: string) => {
  const key = (plan || "basic").toLowerCase();
  if (key === "elite") return 180;
  if (key === "pro") return 60;
  return 15;
};

export const formatPreferredTime = (raw?: string | null) => {
  if (!raw) return "";
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw.trim();
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw.trim();
  const clampedHours = Math.min(23, Math.max(0, hours));
  const clampedMinutes = Math.min(59, Math.max(0, minutes));
  const period = clampedHours >= 12 ? "PM" : "AM";
  const hour12 = clampedHours % 12 === 0 ? 12 : clampedHours % 12;
  const minuteLabel = String(clampedMinutes).padStart(2, "0");
  return `${hour12}:${minuteLabel} ${period}`;
};

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const getDaysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateKeyUTC = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getZonedParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value || "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value || "1");
  const day = Number(parts.find((p) => p.type === "day")?.value || "1");
  return { year, month, day };
};

export const getDateKeyInTimeZone = (date: Date, timeZone: string) => {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const getDailyQuotaForDateInZone = (
  monthlyQuota: number,
  date: Date,
  timeZone: string
) => {
  const { year, month, day } = getZonedParts(date, timeZone);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!daysInMonth || monthlyQuota <= 0) return 0;
  const base = Math.floor(monthlyQuota / daysInMonth);
  const remainder = monthlyQuota % daysInMonth;
  return base + (day <= remainder ? 1 : 0);
};

export const getDailyQuotaForDate = (monthlyQuota: number, date: Date) => {
  const daysInMonth = getDaysInMonth(date);
  if (!daysInMonth || monthlyQuota <= 0) return 0;
  const base = Math.floor(monthlyQuota / daysInMonth);
  const remainder = monthlyQuota % daysInMonth;
  return base + (date.getDate() <= remainder ? 1 : 0);
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
};

export const getDayIndexInZone = (anchorDate: Date, date: Date, timeZone: string) => {
  const anchorKey = getDateKeyInTimeZone(anchorDate, timeZone);
  const targetKey = getDateKeyInTimeZone(date, timeZone);
  const anchor = parseDateKey(anchorKey).getTime();
  const target = parseDateKey(targetKey).getTime();
  const diffMs = target - anchor;
  return Math.round(diffMs / 86_400_000);
};

export const getDailyQuotaForPlan = (plan: string, dayIndex = 0) => {
  const key = (plan || "basic").toLowerCase();
  if (key === "elite") return 6;
  if (key === "pro") return 2;
  return dayIndex % 2 === 0 ? 1 : 0;
};

export const getDailyQuotaForPlanInZone = (
  plan: string,
  date: Date,
  timeZone: string,
  anchorDate: Date
) => {
  const dayIndex = getDayIndexInZone(anchorDate, date, timeZone);
  return getDailyQuotaForPlan(plan, dayIndex);
};

export const buildScheduleItems = ({
  plan,
  monthlyQuota,
  startDate,
  days,
  images,
  title,
  creator,
}: BuildScheduleParams): ScheduleItem[] => {
  const planSchedule = getPlanSchedule(plan);
  const items: ScheduleItem[] = [];
  let imageIndex = 0;

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDays(startDate, dayOffset);
    const dateKey = getDateKey(date);
    const count = getDailyQuotaForPlan(plan, dayOffset);
    for (let i = 0; i < count; i += 1) {
      const time = planSchedule.times[i % planSchedule.times.length];
      const src = images[imageIndex % images.length];
      imageIndex += 1;
      items.push({
        id: `${dateKey}-${i}-${time}`,
        time,
        label: planSchedule.label,
        title,
        src,
        dateKey,
        creator,
      });
    }
  }

  return items;
};
