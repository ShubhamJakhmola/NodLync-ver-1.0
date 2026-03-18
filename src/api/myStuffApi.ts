import { supabase } from "./supabaseClient";

export interface MyStuffCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface MyStuffItem {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  url?: string;
  description?: string;
  created_at: string;
}

export async function getCategories(userId: string) {
  try {
    const result = await supabase
      .from("my_stuff_categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    return { data: (result.data ?? []) as MyStuffCategory[], error: null };
  } catch (err: any) {
    return { data: [] as MyStuffCategory[], error: err };
  }
}

export async function createCategory(payload: { user_id: string; name: string }) {
  const result = await supabase
    .from("my_stuff_categories")
    .insert(payload)
    .select()
    .single();
  return result as { data: MyStuffCategory | null; error: any };
}

export async function deleteCategory(id: string) {
  return supabase.from("my_stuff_categories").delete().eq("id", id);
}

export async function getItems(categoryId: string) {
  try {
    const result = await supabase
      .from("my_stuff_items")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false });
    return { data: (result.data ?? []) as MyStuffItem[], error: null };
  } catch (err: any) {
    return { data: [] as MyStuffItem[], error: err };
  }
}

export async function createItem(payload: Omit<MyStuffItem, "id" | "created_at">) {
  const result = await supabase
    .from("my_stuff_items")
    .insert(payload)
    .select()
    .single();
  return result as { data: MyStuffItem | null; error: any };
}

export async function deleteItem(id: string) {
  return supabase.from("my_stuff_items").delete().eq("id", id);
}
