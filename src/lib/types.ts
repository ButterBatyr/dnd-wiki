export type Role = 'dm' | 'player';
export type Status = 'released' | 'unreleased';
export type ReqStatus = 'new' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
}
export interface Entry {
  id: string;
  title: string;
  body: string;
  image_path: string | null;
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
  title: string;
  comment: string | null;
  status: ReqStatus;
  entry_id: string | null;
  created_at: string;
  profiles?: { email: string; display_name: string | null } | null;
  entries?: { id: string; title: string; status: Status } | null;
}
