"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "sweet" | "drink";
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const groups: Array<{ key: MenuItem["category"]; label: string }> = [
  { key: "meal", label: "Meals" },
  { key: "snack", label: "Snacks" },
  { key: "sweet", label: "Sweets" },
  { key: "drink", label: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load menu");
        setMenu(Array.isArray(data.menu) ? data.menu : []);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load menu");
      }
    }

    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [refreshKey]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Today&apos;s menu</h2>
      </div>

      <div className="p-4 space-y-5">
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!error &&
          groups.map((group) => {
            const items = menu.filter((item) => item.category === group.key);
            if (items.length === 0) return null;

            return (
              <div key={group.key}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                            item.is_veg ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          title={item.is_veg ? "Veg" : "Non-veg"}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                          {item.stock === 0 ? (
                            <span className="mt-1 inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                              Sold out
                            </span>
                          ) : item.stock <= 3 ? (
                            <span className="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Only {item.stock} left
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span>Rs {item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
