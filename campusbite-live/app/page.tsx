"use client";

import Link from "next/link";
import { useState } from "react";
import AgentChat from "@/components/AgentChat";
import MenuPanel from "@/components/MenuPanel";
import WalletOrders from "@/components/WalletOrders";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">CampusBite · SRM canteen ordering agent</h1>
          <p className="text-sm text-slate-500">Order in plain English. Your wallet and menu stay in sync.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/kitchen"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open kitchen screen
          </Link>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>

        <aside className="space-y-4 md:col-span-2">
          <WalletOrders refreshKey={refreshKey} />
          <MenuPanel refreshKey={refreshKey} />
        </aside>
      </div>
    </main>
  );
}
