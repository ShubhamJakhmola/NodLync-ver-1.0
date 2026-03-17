import type { User } from "@supabase/supabase-js";

export type ProjectStatus = "draft" | "active" | "paused" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  user_id: string;
}

export interface AppUser extends User {}
