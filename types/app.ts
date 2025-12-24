// types/app.ts

export type HistoryItem = {
    id: string;
    createdAt: string | Date;
    userId?: string;
    type?: string | null;
    prompt?: string | null;
    resultUrl?: string | null;
    imageUrl?: string | null;
    images?: string[] | null;
    status?: "queued" | "processing" | "done" | "failed" | string;
    [key: string]: any;
  };
  
  export type JobItem = {
    id: string;
    userId?: string;
    type?: string | null;
  
    // progress / status
    progress: number; // 0..100
    error?: string | null;
  
    // result
    resultUrl?: string | null;
  
    createdAt?: string | Date;
  
    [key: string]: any;
  };
  