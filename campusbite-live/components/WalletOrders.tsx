"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time?: string | null;
  items?: string;
};

type WalletData = {
  name?: string;
  balance?: number;
};

function statusClasses(status: string) {
  switch (status) {
    case "placed":
      return "border border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "preparing":
      return "border border-sky-400/30 bg-sky-500/10 text-sky-200";
    case "ready":
      return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "collected":
      return "border border-slate-400/30 bg-slate-500/10 text-slate-200";
    case "cancelled":
      return "border border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border border-slate-400/30 bg-slate-500/10 text-slate-200";
  }
}

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [wallet, setWallet] = useState<WalletData>({ name: "Student", balance: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load wallet");

        const safeWallet = data.wallet ?? {};
        const safeOrders = Array.isArray(data.orders) ? data.orders : [];

        setWallet({
          name: safeWallet.name ?? "Student",
          balance: Number(safeWallet.balance ?? 0),
        });

        setOrders(
          safeOrders.map((order: any) => {
            const pickup = Array.isArray(order.pickup_time)
              ? order.pickup_time[0]
              : order.pickup_time ?? null;
            const items = order.items ?? order.item_names ?? "No items";

            return {
              id: Number(order.id ?? 0),
              status: order.status ?? "placed",
              total: Number(order.total ?? 0),
              pickup_time: pickup,
              items: String(items),
            };
          })
        );
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load wallet");
      }
    }

    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [refreshKey]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-sm">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wallet</p>
            <h2 className="mt-1 text-xl font-semibold">Rs {wallet.balance}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Student</p>
            <p className="mt-1 text-sm text-slate-200">{wallet.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-200">My orders today</h3>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        {!error && orders.length === 0 && (
          <p className="text-sm text-slate-400">No orders yet. Your latest canteen orders will appear here.</p>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">Order #{order.id}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between gap-3">
                  <span>Pickup</span>
                  <span>{order.pickup_time ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Items</span>
                  <span className="max-w-[60%] text-right text-slate-100">{order.items ?? "No items"}</span>
                </div>
                <div className="flex justify-between gap-3 font-medium text-slate-100">
                  <span>Total</span>
                  <span>Rs {order.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
