import type { FieldType } from "@/db/schema";

export type PublicService = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  locationIds: number[];
  addonIds: number[];
  formIds: number[];
};

export type PublicForm = {
  id: number;
  name: string;
  description: string;
  fields: { id: number; type: FieldType; label: string; options: string[]; required: boolean }[];
};

export type PublicData = {
  businessName: string;
  timezone: string;
  bannerImages: string[];
  policies: { title: string; body: string }[];
  locationNote: string;
  phone: string;
  email: string;
  instagram: string;
  onlineDeposit: boolean;
  manualDepositInstructions: string;
  categories: { id: number; name: string }[];
  services: PublicService[];
  addons: { id: number; name: string; durationMin: number; priceCents: number }[];
  forms: PublicForm[];
  locations: { id: number; name: string; address: string }[];
};

export type Slot = { start: string; locationIds: number[] };

export type AvailabilityResponse = {
  timezone: string;
  startDate: string;
  today: string;
  lastDate: string;
  durationMin: number;
  dates: { date: string; slots: Slot[] }[];
};
