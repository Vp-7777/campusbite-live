import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .order("category", { ascending: true })
      .order("price", { ascending: true });

    if (error) {
      console.error("[GET /api/menu]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menu: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load menu";
    console.error("[GET /api/menu]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
