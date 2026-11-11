import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  const rows = asArray(value);
  return rows[0] ?? null;
}

export async function GET() {
  try {
    const walletPromise = getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();

    const ordersPromise = getSupabase()
      .from("orders")
      .select(
        "id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))"
      )
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5);

    const [{ data: walletData, error: walletError }, { data: orderData, error: orderError }] = await Promise.all([
      walletPromise,
      ordersPromise,
    ]);

    if (walletError) {
      console.error("[GET /api/me] wallet", walletError.message);
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }
    if (orderError) {
      console.error("[GET /api/me] orders", orderError.message);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const orders = (orderData ?? []).map((order: any) => {
      const pickupRow = firstRow(order.pickup_slots);
      const pickupTime = pickupRow?.slot_time ?? pickupRow?.time ?? null;
      const itemNames = asArray(order.order_items)
        .map((item: any) => {
          const menuRow = firstRow(item?.menu_items);
          return menuRow?.name ?? item?.name ?? "Item";
        })
        .filter(Boolean)
        .join(", ");

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: pickupTime ? formatSlot(String(pickupTime)) : null,
        items: itemNames || "No items",
      };
    });

    return NextResponse.json({
      student_id: CURRENT_STUDENT_ID,
      wallet: walletData,
      orders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load student details";
    console.error("[GET /api/me]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
