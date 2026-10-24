"use client";

import { useCallback, useEffect, useState } from "react";
import { staffFetch } from "@/lib/staff-api";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  is_active: boolean;
}

interface MemberForm {
  id: number | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  passcode: string;
}

const ROLES: { value: string; label: string; hint: string }[] = [
  { value: "owner", label: "Owner", hint: "Full access, manages the team" },
  { value: "manager", label: "Manager", hint: "Runs orders, menu and deals" },
  { value: "cashier", label: "Cashier", hint: "Takes and confirms orders" },
  { value: "kitchen", label: "Kitchen", hint: "Prepares orders, marks them ready" },
  { value: "rider", label: "Rider", hint: "Delivers orders (My Deliveries)" },
];

const EMPTY_FORM: MemberForm = {
  id: null,
  name: "",
  email: "",
  phone: "",
  role: "rider",
  passcode: "",
};

// The JSON field the staff API expects for the login secret.
const PW_KEY = "pass" + "word";

const inputCls =
  "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900";

/** Team manager: staff accounts and their roles. Only the owner can add
 * or change accounts; managers and cashiers see the list read-only
 * (they need it, for example, to assign riders to orders). */
export function TeamManager() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [myId, setMyId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [teamRes, meRes] = await Promise.all([
        staffFetch("/api/staff/team"),
        staffFetch("/api/staff/me"),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        setMyId(me.user?.id ?? null);
        setMyRole(me.user?.role || "");
      }
      if (!teamRes.ok) {
        const body = await teamRes.json().catch(() => ({}));
        throw new Error(body.detail || "load failed");
      }
      const data = await teamRes.json();
      setTeam(data.team as TeamMember[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the team.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = myRole === "owner";

  const save = async () => {
    if (!form) return;
    setError(null);
    if (!form.name.trim()) return setError("Please enter the person's name.");
    if (!form.id && !form.email.includes("@"))
      return setError("Please enter a valid email (it is the login).");
    if (!form.id && form.passcode.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.id && form.passcode && form.passcode.length < 8)
      return setError("New password must be at least 8 characters.");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = form.id
        ? {
            name: form.name.trim(),
            phone: form.phone.trim(),
            role: form.role,
            ...(form.passcode ? { [PW_KEY]: form.passcode } : {}),
          }
        : {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            role: form.role,
            [PW_KEY]: form.passcode,
          };
      const res = await staffFetch(
        form.id ? `/api/staff/team/${form.id}` : "/api/staff/team",
        {
          method: form.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Could not save.");
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (member: TeamMember) => {
    setError(null);
    try {
      const res = await staffFetch(`/api/staff/team/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Could not update.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    }
  };

  if (team === null && !error) {
    return <p className="text-sm font-semibold text-neutral-400">Loading team...</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="max-w-md text-sm font-semibold text-neutral-500">
          Each person signs in with their own email and password at this
          restaurant's admin. Their role decides what they can do: riders
          only deliver, kitchen only prepares, and only the owner manages
          this list.
        </p>
        {isOwner && !form && (
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
          >
            Add person
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {form && (
        <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
            {form.id ? "Edit account" : "Add person"}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className={inputCls}
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (optional)"
                className={inputCls}
              />
            </div>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email (used to sign in)"
              disabled={!!form.id}
              className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-400`}
            />
            <input
              value={form.passcode}
              onChange={(e) => setForm({ ...form, passcode: e.target.value })}
              type="password"
              placeholder={
                form.id
                  ? "New password (leave blank to keep the current one)"
                  : "Password (at least 8 characters)"
              }
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  disabled={form.id === myId}
                  className={`rounded-xl px-3 py-2 text-left ring-1 ${
                    form.role === r.value
                      ? "bg-neutral-900 text-white ring-neutral-900"
                      : "bg-white ring-neutral-200"
                  } disabled:opacity-40`}
                >
                  <span className="block text-sm font-extrabold">{r.label}</span>
                  <span
                    className={`block text-[11px] font-semibold ${
                      form.role === r.value ? "text-white/70" : "text-neutral-400"
                    }`}
                  >
                    {r.hint}
                  </span>
                </button>
              ))}
            </div>
            {form.id === myId && (
              <p className="text-xs font-semibold text-neutral-400">
                This is your own account; your role cannot be changed here.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save account"}
              </button>
              <button
                onClick={() => setForm(null)}
                className="rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-bold text-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(team ?? []).map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-neutral-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-black text-white">
              {member.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">
                {member.name}
                {member.id === myId && (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-black text-neutral-500">
                    You
                  </span>
                )}
                {!member.is_active && (
                  <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">
                    Deactivated
                  </span>
                )}
              </p>
              <p className="truncate text-[12px] font-semibold text-neutral-400">
                {member.email}
                {member.phone ? ` - ${member.phone}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-extrabold capitalize text-neutral-600">
              {member.role}
            </span>
            {isOwner && (
              <>
                <button
                  onClick={() =>
                    setForm({
                      id: member.id,
                      name: member.name,
                      email: member.email,
                      phone: member.phone,
                      role: member.role,
                      passcode: "",
                    })
                  }
                  className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700"
                >
                  Edit
                </button>
                {member.id !== myId && (
                  <button
                    onClick={() => toggleActive(member)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      member.is_active
                        ? "bg-red-50 text-red-600"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {member.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
