import influencers from "@/app/data/influencers.json";

export type InfluencerProfile = {
  id: string;
  name: string;
  subtitle: string;
  src: string;
  folderName: string;
};

export const INFLUENCERS = influencers as InfluencerProfile[];

export const getInfluencerById = (id?: string | null) =>
  INFLUENCERS.find((influencer) => influencer.id === id) ?? null;
