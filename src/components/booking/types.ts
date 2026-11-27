import type { FieldType } from "@/db/schema";
import type { HoursRow } from "@/lib/display";

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
  policies: { title: string; body: string }[];
  locationNote: string;
  confirmationNote: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  cashAppHandle: string;
  zelleHandle: string;
  onlineDeposit: boolean;
  /** Offer "send my reminder on WhatsApp" at checkout. */
  whatsappReminders: boolean;
  /** Studio WhatsApp number for the "WhatsApp me" link (empty = hidden). */
  whatsappNumber: string;
  manualDepositInstructions: string;
  /** The deposit most services use, for headline copy. */
  depositCents: number;
  /** e.g. "Mon – Sat · 9:30 AM – 8 PM" */
  hoursHeadline: string;
  /** One group when every studio keeps the same hours, otherwise one per studio. */
  hours: { label: string; rows: HoursRow[] }[];
  categories: { id: number; name: string; description: string; imageUrl: string | null }[];
  /** Most-booked services recently (shown with a "Popular" badge). */
  popularIds: number[];
  /** Photos the owner added under Photos, for the landing page's photo wall (in order). */
  gallery: { url: string; alt: string; width: number; height: number }[];
  /** The owner's chosen hero photo (null: the built-in brow photo). */
  hero: { url: string; alt: string; width: number; height: number } | null;
  artist: { name: string; bio: string };
  services: PublicService[];
  addons: { id: number; name: string; durationMin: number; priceCents: number }[];
  forms: PublicForm[];
  /** Street addresses are only shared after booking, so the page gets the city. */
  locations: { id: number; name: string; city: string | null }[];
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
