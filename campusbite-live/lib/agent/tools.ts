import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_STUDENT_ID, formatSlot } from "../campusbite";

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when the student wants to browse the canteen menu, filter by category or price, or check what is available today.",
  schema: z.object({
    category: z.enum(["meal", "snack", "drink", "sweet"]).optional().describe("Optional menu category."),
    veg_only: z.boolean().optional().describe("Set to true to show only vegetarian items."),
    max_price: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum item price in rupees, if the user has a budget."),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category", { ascending: true })
      .order("price", { ascending: true })
      .limit(50);

    if (category) query = query.eq("category", category);
    if (veg_only !== undefined) query = query.eq("is_veg", veg_only);
    if (max_price !== undefined) query = query.lte("price", max_price);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description:
    "Use this when the user asks about their wallet, balance, available money, or how much they can spend today.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();

    if (error) throw new Error(error.message);
    return { student_id: CURRENT_STUDENT_ID, name: data.name, balance: data.balance };
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description:
    "Use this when the user asks for available pickup times or wants to know which slots are free today.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time", { ascending: true });

    if (error) throw new Error(error.message);

    const slots = (data ?? [])
      .map((row) => ({
        slot_id: row.id,
        time: formatSlot(row.slot_time),
        free: Number(row.capacity) - Number(row.booked),
      }))
      .filter((row) => row.free > 0);

    return { count: slots.length, slots };
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description:
    "Use this when the user asks for their recent orders, current order status, or pickup time.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, created_at, slot_id, pickup_slots(slot_time), order_items(quantity, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);

    const orders = (data ?? []).map((order: any) => {
      const pickup = order.pickup_slots ? formatSlot(order.pickup_slots.slot_time) : null;
      const itemNames = (order.order_items ?? []).map((item: any) => item.menu_items?.name ?? "Item").join(", ");

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: pickup,
        items: itemNames || "No items",
      };
    });

    return { count: orders.length, orders };
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description:
    "Use this when the student wants to place a lunch or snack order for a specific pickup slot and has chosen items from the menu.",
  writes: true,
  schema: z.object({
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive().describe("Menu item id from getMenu results."),
          quantity: z.number().int().min(1).max(5).describe("How many of this item, from 1 to 5."),
        })
      )
      .min(1)
      .describe("At least one item to order."),
    slot_id: z.number().int().positive().describe("The pickup slot id from getPickupSlots."),
  }),
  run: async ({ items, slot_id }) => {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });

    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description:
    "Use this when the student asks to cancel one of their placed orders and the kitchen has not started it yet.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The id of the order to cancel."),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });

    if (error) throw new Error(error.message);
    return data;
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [getMenu, getWalletBalance, getPickupSlots, getMyOrders, placeOrder, cancelOrder];
