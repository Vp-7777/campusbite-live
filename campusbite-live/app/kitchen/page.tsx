"use client";

import { useEffect, useState } from "react";

type KitchenOrder = {
  id: number;
  status: string;
  student_name: string;
  pickup_time: string | null;
  items: string;
  total: number;
};

const columns = [
  { key: "placed", label: "New orders", buttonText: "Start preparing" },
  { key: "preparing", label: "Preparing", buttonText: "Mark ready" },
  { key: "ready", label: "Ready for pickup", buttonText: "Collected" },
] as const;

const statusStyles: Record<string, string> = {
  placed: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  preparing: "bg-sky-500/15 text-sky-200 border border-sky-400/30",
  ready: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load kitchen orders");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load kitchen orders");
    }
  }

  async function updateStatus(orderId: number, nextStatus: string) {
    try {
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Kitchen board</p>
            <h1 className="mt-1 text-2xl font-bold text-white">CampusBite</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live
            </span>
            <a href="/" className="text-sm text-slate-300 hover:text-white">
              Student screen
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

        <div className="grid gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const columnOrders = orders.filter((order) => order.status === column.key);

            return (
              <section key={column.key} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/50">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">{column.label}</h2>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{columnOrders.length}</span>
                </div>

                <div className="space-y-3">
                  {columnOrders.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                      No orders
                    </div>
                  )}

                  {columnOrders.map((order) => {
                    let nextStatus: string | null = null;
                    if (column.key === "placed") nextStatus = "preparing";
                    else if (column.key === "preparing") nextStatus = "ready";
                    else if (column.key === "ready") nextStatus = "collected";

                    return (
                      <div key={order.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-lg font-semibold text-white">Order #{order.id}</p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[order.status]}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between gap-3">
                            <span>Pickup</span>
                            <span className="font-medium text-slate-100">{order.pickup_time ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Student</span>
                            <span className="max-w-[60%] truncate text-right text-slate-100">{order.student_name}</span>
                          </div>
                          <div>
                            <p className="mb-1 text-slate-400">Items</p>
                            <p className="text-slate-100">{order.items || "No items"}</p>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-base font-semibold text-white">
                            <span>Total</span>
                            <span>Rs {order.total}</span>
                          </div>
                        </div>

                        {nextStatus && (
                          <button
                            onClick={() => updateStatus(order.id, nextStatus)}
                            className="mt-4 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                          >
                            {column.buttonText}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
