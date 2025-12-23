"use client";

import Dexie, { Table } from "dexie";

/* ---------------------------------------------------
   Result item type
--------------------------------------------------- */
export interface ResultItem {
  id: string;
  url: string;         
  createdAt: number;
}

/* ---------------------------------------------------
   Dexie DB Setup
--------------------------------------------------- */
class MituxDatabase extends Dexie {
  results!: Table<ResultItem, string>;

  constructor() {
    super("mitux-db");

    this.version(1).stores({
      results: "id, createdAt", 
    });
  }
}

export const db = new MituxDatabase();

/* ---------------------------------------------------
   DB Helper Functions
--------------------------------------------------- */

// Save item
export async function saveResult(item: ResultItem) {
  return await db.results.put(item);
}

// Load all items
export async function loadResults(): Promise<ResultItem[]> {
  return await db.results.orderBy("createdAt").reverse().toArray();
}

// Delete all items
export async function clearResults() {
  return await db.results.clear();
}

// Delete one item
export async function deleteResult(id: string) {
  return await db.results.delete(id);
}
