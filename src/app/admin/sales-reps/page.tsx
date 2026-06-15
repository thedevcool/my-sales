"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/PageHeader"
import { Modal } from "@/components/ui/Modal"
import { toast } from "@/components/ui/sonner"
import { UserPlus, KeyRound, Users, ShoppingBag } from "lucide-react"

interface Rep {
  id: string
  name: string
  username: string
  isActive: boolean
  saleCount: number
}

export default function AdminSalesRepsPage() {
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [creating, setCreating] = useState(false)
  const [resetFor, setResetFor] = useState<Rep | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  function fetchReps() {
    fetch("/api/admin/sales-reps")
      .then((r) => r.json())
      .then((d) => setReps(Array.isArray(d) ? d : []))
      .catch(() => setReps([]))
      .finally(() => setLoading(false))
  }

  useEffect(fetchReps, [])

  const suggestedUsername = (username || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

  async function createRep(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !password.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create staff")
      toast.success("Staff added", { description: `Username: ${data.username}` })
      setName(""); setUsername(""); setPassword(""); setShowForm(false)
      fetchReps()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create staff")
    } finally {
      setCreating(false)
    }
  }

  async function toggleRep(rep: Rep) {
    try {
      const res = await fetch("/api/admin/sales-reps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rep.id, isActive: !rep.isActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${rep.name} ${rep.isActive ? "deactivated" : "activated"}`)
      fetchReps()
    } catch {
      toast.error("Update failed")
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetFor || newPassword.length < 4) return
    setResetting(true)
    try {
      const res = await fetch("/api/admin/sales-reps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetFor.id, password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Reset failed")
      toast.success(`Password updated for ${resetFor.name}`)
      setResetFor(null); setNewPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setResetting(false)
    }
  }

  const activeCount = reps.filter((r) => r.isActive).length

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
      <PageHeader
        title="Staff"
        subtitle={loading ? "" : `${reps.length} staff · ${activeCount} active`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-md">
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        }
      />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-[76px] rounded-2xl" />)}</div>
      ) : reps.length === 0 ? (
        <div className="card text-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">No staff yet</p>
          <p className="text-xs text-slate-400 mt-1">Add your first sales rep to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reps.map((rep, i) => (
            <div key={rep.id} className="card card-hover p-4 flex items-center justify-between gap-3 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                  rep.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                }`}>
                  {rep.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">{rep.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>@{rep.username}</span>
                    <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{rep.saleCount}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`badge ${rep.isActive ? "badge-green" : "badge-gray"}`}>{rep.isActive ? "Active" : "Inactive"}</span>
                <button onClick={() => { setResetFor(rep); setNewPassword("") }} className="btn btn-ghost btn-icon text-slate-400 hover:text-indigo-600" title="Reset password">
                  <KeyRound className="w-4 h-4" />
                </button>
                <button onClick={() => toggleRep(rep)} className={`btn btn-sm ${rep.isActive ? "btn-ghost text-red-500 hover:bg-red-50" : "btn-ghost text-green-600 hover:bg-green-50"}`}>
                  {rep.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add staff modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Sales Staff"
        description="Each rep signs in with their own username and password."
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-md">Cancel</button>
            <button onClick={createRep} disabled={creating || !name.trim() || !password.trim()} className="btn btn-primary btn-md">
              {creating ? "Creating…" : "Create Staff"}
            </button>
          </>
        }
      >
        <form onSubmit={createRep} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grace Okafor" className="input" autoFocus required />
          </div>
          <div>
            <label className="label">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={suggestedUsername || "auto from name"} className="input" autoCapitalize="none" />
            <p className="text-xs text-slate-400 mt-1.5">Used to sign in. {suggestedUsername && `Will be “${suggestedUsername}”.`}</p>
          </div>
          <div>
            <label className="label">Password</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" className="input" required />
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title="Reset Password"
        description={resetFor ? `Set a new password for ${resetFor.name} (@${resetFor.username})` : ""}
        footer={
          <>
            <button onClick={() => setResetFor(null)} className="btn btn-secondary btn-md">Cancel</button>
            <button onClick={resetPassword} disabled={resetting || newPassword.length < 4} className="btn btn-primary btn-md">
              {resetting ? "Saving…" : "Update Password"}
            </button>
          </>
        }
      >
        <form onSubmit={resetPassword}>
          <label className="label">New password</label>
          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 4 characters" className="input" autoFocus />
        </form>
      </Modal>
    </div>
  )
}
