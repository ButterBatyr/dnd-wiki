export type Role = 'dm' | 'player';
export type Status = 'released' | 'unreleased';
export type ReqStatus = 'new' | 'approved' | 'rejected';
export type ReqKind = 'new' | 'edit';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}
export interface BadgePreset {
  label: string;
  color: string;
}
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  statuses: BadgePreset[];
}
// Область обрезки в процентах от картинки
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Entry {
  id: string;
  title: string;
  summary: string;
  body: string;
  image_path: string | null;
  image_crop: Crop | null;
  badge: string | null;
  category_id: string | null;
  tags: string[];
  status: Status;
  created_at: string;
  updated_at: string;
  released_at: string | null;
}
export interface Request {
  id: string;
  player_id: string;
  kind: ReqKind;
  title: string;
  comment: string | null;
  proposed_title: string | null;
  proposed_body: string | null;
  status: ReqStatus;
  entry_id: string | null;
  created_at: string;
  profiles?: { email: string; display_name: string | null } | null;
  entries?: { id: string; title: string; body?: string; status: Status } | null;
}
export interface Message {
  id: string;
  user_id: string;
  author_name: string;
  is_dm: boolean;
  body: string;
  image_path: string | null;
  created_at: string;
}

export interface LinkedEntry {
  id: string;
  title: string;
  badge: string | null;
  category_id: string | null;
  status: Status;
}
export interface EntryLink {
  id: string;
  from_entry_id: string;
  to_entry_id: string;
  label: string | null;
  reverse_label: string | null;
  from_e: LinkedEntry | null;
  to_e: LinkedEntry | null;
}
