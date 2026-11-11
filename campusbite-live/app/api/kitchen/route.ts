import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  const rows = asArray(value);
  return rows[0] ?? null;
}

const updateStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["placed", "preparing", "ready", "collected"]),
});

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(
        "id, status, total, created_at, student_id, pickup_slots(slot_time), wallets(name), order_items(quantity, menu_items(name))"
      )
      .in("status", ["placed", "preparing", "ready"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/kitchen]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data ?? []).map((order: any) => {
      const pickupRow = firstRow(order.pickup_slots);
      const walletRow = firstRow(order.wallets);
      const itemsText = asArray(order.order_items)
        .map((item: any) => {
          const menuRow = firstRow(item?.menu_items);
          return menuRow?.name ?? item?.name ?? "Item";
        })
        .filter(Boolean)
        .join(", ") || "No items";

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        student_name: walletRow?.name ?? "Unknown",
        pickup_time: pickupRow?.slot_time ? formatSlot(String(pickupRow.slot_time)) : null,
        items: itemsText,
      };
    });

    return NextResponse.json({ orders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load kitchen orders";
    console.error("[GET /api/kitchen]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status update", details: parsed.error.issues }, { status: 400 });
    }

    const { order_id, status } = parsed.data;
    const { data: currentOrder, error: fetchError } = await getSupabase()
      .from("orders")
      .select("status")
      .eq("id", order_id)
      .single();

    if (fetchError || !currentOrder) {
      console.error("[POST /api/kitchen] fetch order", fetchError?.message ?? "Order not found");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allowedNext = nextStatus[currentOrder.status];
    if (allowedNext !== status) {
      return NextResponse.json(
        { error: `Cannot move order from ${currentOrder.status} to ${status}.` },
        { status: 409 }
      );
    }

    const { data, error } = await getSupabase()
      .from("orders")
      .update({ status })
      .eq("id", order_id)
      .select("id, status")
      .single();

    if (error) {
      console.error("[POST /api/kitchen] update", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order status";
    console.error("[POST /api/kitchen]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
