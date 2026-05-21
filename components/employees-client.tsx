"use client";

import { useState } from "react";
import { Plus, Pencil, KeyRound, PowerOff, Power, Trash2, X, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types";

const COLORS = [
  { hex: "#FFD800", label: "Κίτρινο" },
  { hex: "#E63946", label: "Κόκκινο" },
  { hex: "#7DD3FC", label: "Μπλε" },
  { hex: "#4CAF50", label: "Πράσινο" },
  { hex: "#FF8C00", label: "Πορτοκαλί" },
  { hex: "#9B59B6", label: "Μωβ" },
  { hex: "#F8A5C2", label: "Ροζ" },
  { hex: "#0A0A0A", label: "Μαύρο" },
];

interface EmployeesClientProps {
  initialEmployees: Profile[];
}

export function EmployeesClient({ initialEmployees }: EmployeesClientProps) {
  const [employees, setEmployees] = useState<Profile[]>(initialEmployees);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Profile | null>(null);
  const [resetting, setResetting]   = useState<Profile | null>(null);

  function handleCreated(p: Profile) {
    setEmployees((prev) => [...prev, p].sort((a, b) => a.nickname.localeCompare(b.nickname)));
    setShowCreate(false);
  }

  function handleUpdated(p: Profile) {
    setEmployees((prev) => prev.map((e) => (e.id === p.id ? p : e)));
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      {/* Create button */}
      <div className="p-4">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 py-3
                     bg-coo-black text-coo-yellow font-archivo text-sm
                     border-2 border-coo-black"
          style={{ boxShadow: "4px 4px 0 #FFD800" }}
        >
          <Plus size={16} />
          Νέος Υπάλληλος
        </button>
      </div>

      {/* Employee list */}
      <div className="flex flex-col gap-3 px-4 pb-8">
        {employees.map((emp) => (
          <EmployeeRow
            key={emp.id}
            employee={emp}
            onEdit={() => setEditing(emp)}
            onResetPassword={() => setResetting(emp)}
            onToggleActive={(active) => {
              handleUpdated({ ...emp, active });
              fetch("/api/admin/employees", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: emp.id, active }),
              }).then((r) => {
                if (!r.ok) toast.error("Σφάλμα");
              });
            }}
            onDelete={() => handleDeleted(emp.id)}
          />
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <EmployeeModal
          title="Νέος Υπάλληλος"
          onClose={() => setShowCreate(false)}
          onSave={handleCreated}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EmployeeModal
          title="Επεξεργασία"
          employee={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdated}
        />
      )}

      {/* Reset password modal */}
      {resetting && (
        <ResetPasswordModal
          employee={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}

// ── Employee row ──────────────────────────────────────────────────────────────

function EmployeeRow({
  employee: emp,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
}: {
  employee: Profile;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: (v: boolean) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={cn(
        "bg-white border-2 border-coo-black p-4",
        !emp.active && "opacity-50"
      )}
      style={{ boxShadow: "4px 4px 0 #0A0A0A" }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Color dot + nickname */}
        <div
          className="w-9 h-9 shrink-0 border-2 border-coo-black flex items-center justify-center font-archivo text-sm"
          style={{ backgroundColor: emp.color }}
        >
          {emp.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-archivo text-sm text-coo-black leading-none">{emp.nickname}</p>
          <p className="font-dm text-xs text-coo-black/45 mt-0.5">{emp.role === "admin" ? "Admin" : "Υπάλληλος"}</p>
        </div>
        {!emp.active && (
          <span className="font-archivo text-[10px] px-2 py-0.5 border border-coo-black/30 text-coo-black/40">
            ΑΝΕΝΕΡΓΟΣ
          </span>
        )}
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <p className="font-dm text-xs text-coo-red flex-1">Διαγραφή;</p>
          <button
            onClick={() => {
              fetch(`/api/admin/employees?id=${emp.id}`, { method: "DELETE" })
                .then((r) => { if (r.ok) onDelete(); else toast.error("Σφάλμα διαγραφής"); });
            }}
            className="flex items-center gap-1 font-archivo text-xs px-3 py-1.5 bg-coo-red text-white border border-coo-black"
          >
            <Check size={12} /> Ναι
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex items-center gap-1 font-archivo text-xs px-3 py-1.5 bg-white text-coo-black border border-coo-black"
          >
            <X size={12} /> Όχι
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <ActionBtn icon={<Pencil size={13} />} label="Επεξ." onClick={onEdit} />
          <ActionBtn icon={<KeyRound size={13} />} label="Κωδικός" onClick={onResetPassword} />
          <ActionBtn
            icon={emp.active ? <PowerOff size={13} /> : <Power size={13} />}
            label={emp.active ? "Απενεργ." : "Ενεργοπ."}
            onClick={() => onToggleActive(!emp.active)}
          />
          <ActionBtn
            icon={<Trash2 size={13} />}
            label="Διαγραφή"
            onClick={() => setConfirmDelete(true)}
            danger
          />
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 font-archivo text-[11px] px-2 py-1.5 border border-coo-black flex-1 justify-center",
        danger ? "text-coo-red hover:bg-coo-red/10" : "hover:bg-coo-yellow/20"
      )}
    >
      {icon}{label}
    </button>
  );
}

// ── Create / Edit modal ───────────────────────────────────────────────────────

function EmployeeModal({
  title,
  employee,
  onClose,
  onSave,
}: {
  title: string;
  employee?: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const isEdit = !!employee;
  const [nickname, setNickname] = useState(employee?.nickname ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<UserRole>(employee?.role ?? "employee");
  const [color, setColor]       = useState(employee?.color ?? "#FFD800");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!nickname.trim()) { setError("Βάλε όνομα"); return; }
    if (!isEdit && password.length < 6) { setError("Κωδικός min 6 χαρακτήρες"); return; }

    setLoading(true);
    try {
      const body = isEdit
        ? { id: employee!.id, nickname, role, color }
        : { nickname, password, role, color };

      const res = await fetch("/api/admin/employees", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Σφάλμα"); return; }

      toast.success(isEdit ? "Αποθηκεύτηκε" : "Δημιουργήθηκε!");
      onSave({
        ...(employee ?? {} as Profile),
        id:       isEdit ? employee!.id : json.id,
        nickname: nickname.trim(),
        full_name: nickname.trim(),
        role,
        color,
        active: employee?.active ?? true,
        email: employee?.email ?? "",
        phone: employee?.phone ?? null,
        avatar_url: employee?.avatar_url ?? null,
        created_at: employee?.created_at ?? new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-archivo text-lg text-coo-black mb-5">{title}</h2>

      {/* Nickname */}
      <label className="font-archivo text-xs tracking-wider text-coo-black block mb-1">ΟΝΟΜΑ</label>
      <input
        type="text"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        autoFocus
        autoCapitalize="words"
        placeholder="πχ. Λένιο"
        className="w-full border-2 border-coo-black px-4 py-3 font-dm text-base bg-coo-paper
                   placeholder:text-coo-black/30 focus:outline-none focus:bg-coo-yellow/20
                   transition-colors mb-4"
      />

      {/* Password (create only) */}
      {!isEdit && (
        <>
          <label className="font-archivo text-xs tracking-wider text-coo-black block mb-1">ΚΩΔΙΚΟΣ</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Τουλάχιστον 6 χαρακτήρες"
            className="w-full border-2 border-coo-black px-4 py-3 font-dm text-base bg-coo-paper
                       placeholder:text-coo-black/30 focus:outline-none focus:bg-coo-yellow/20
                       transition-colors mb-4"
          />
        </>
      )}

      {/* Role */}
      <label className="font-archivo text-xs tracking-wider text-coo-black block mb-2">ΡΟΛΟΣ</label>
      <div className="flex gap-2 mb-4">
        {(["employee", "admin"] as UserRole[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "flex-1 py-2 font-archivo text-sm border-2 border-coo-black transition-colors",
              role === r ? "bg-coo-black text-coo-yellow" : "bg-white text-coo-black hover:bg-coo-yellow/20"
            )}
          >
            {r === "admin" ? "Admin" : "Υπάλληλος"}
          </button>
        ))}
      </div>

      {/* Color */}
      <label className="font-archivo text-xs tracking-wider text-coo-black block mb-2">ΧΡΩΜΑ AVATAR</label>
      <div className="flex gap-2 flex-wrap mb-5">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            title={c.label}
            aria-label={c.label}
            className={cn(
              "w-8 h-8 border-2 transition-transform",
              color === c.hex ? "border-coo-black scale-110" : "border-coo-black/20 hover:scale-105"
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      {error && (
        <p className="font-dm text-sm text-coo-red mb-4">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 bg-coo-black text-coo-yellow font-archivo text-base
                   border-2 border-coo-black disabled:opacity-40"
        style={{ boxShadow: loading ? "none" : "4px 4px 0 #FFD800" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Αποθήκευση…
          </span>
        ) : isEdit ? "Αποθήκευση" : "Δημιουργία"}
      </button>
    </Overlay>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ employee, onClose }: { employee: Profile; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleReset() {
    setError(null);
    if (password.length < 6) { setError("Min 6 χαρακτήρες"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employee.id, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Σφάλμα"); return; }
      toast.success("Ο κωδικός άλλαξε!");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="font-archivo text-lg text-coo-black mb-1">Αλλαγή κωδικού</h2>
      <p className="font-dm text-sm text-coo-black/55 mb-5">
        Νέος κωδικός για <strong>{employee.nickname}</strong>
      </p>

      <label className="font-archivo text-xs tracking-wider text-coo-black block mb-1">ΝΕΟ ΚΩΔΙΚΟΣ</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        placeholder="Τουλάχιστον 6 χαρακτήρες"
        className="w-full border-2 border-coo-black px-4 py-3 font-dm text-base bg-coo-paper
                   placeholder:text-coo-black/30 focus:outline-none focus:bg-coo-yellow/20
                   transition-colors mb-4"
      />

      {error && <p className="font-dm text-sm text-coo-red mb-4">{error}</p>}

      <button
        onClick={handleReset}
        disabled={loading}
        className="w-full py-3 bg-coo-black text-coo-yellow font-archivo text-base
                   border-2 border-coo-black disabled:opacity-40"
        style={{ boxShadow: loading ? "none" : "4px 4px 0 #FFD800" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Αποθήκευση…
          </span>
        ) : "Αλλαγή κωδικού"}
      </button>
    </Overlay>
  );
}

// ── Shared overlay ────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-coo-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-phone bg-coo-paper border-t-2 border-coo-black p-6
                   max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 -4px 0 #0A0A0A" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-coo-black/40 hover:text-coo-black"
          aria-label="Κλείσιμο"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
