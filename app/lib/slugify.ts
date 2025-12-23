export function slugify(str: string): string {
    return String(str || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .replace(/_+/g, "_")
      .toLowerCase();
  }
  