import { useState, useEffect } from "react";

const STAGES = ["Identified", "Contacted", "Follow-up", "Responded", "Meeting", "Closed"];
const LANGUAGES = ["DE", "FR", "IT", "EN"];
const TYPES = ["IFA", "SO/Association", "Bank", "Insurer", "Pension Fund"];
const STAGE_COLORS = {
  "Identified": "#94a3b8",
  "Contacted": "#60a5fa",
  "Follow-up": "#f59e0b",
  "Responded": "#a78bfa",
  "Meeting": "#34d399",
  "Closed": "#10b981"
};

const EMPTY_FORM = {
  name: "", org: "", type: "IFA", email: "", phone: "",
  language: "DE", stage: "Identified", notes: "", nextAction: "", date: new Date().toISOString().split("T")[0]
};

export default function App() {
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState("pipeline"); // pipeline | list | add | detail
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ stage: "All", language: "All", type: "All" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    try {
      const result = await window.storage.get("ipsiq_leads");
      if (result) setLeads(JSON.parse(result.value));
    } catch (e) { /* no leads yet */ }
    setLoading(false);
  }

  async function saveLeads(updated) {
    setLeads(updated);
    try { await window.storage.set("ipsiq_leads", JSON.stringify(updated)); } catch (e) {}
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function addLead() {
    if (!form.name || !form.org) return;
    const lead = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() };
    saveLeads([lead, ...leads]);
    setForm(EMPTY_FORM);
    setView("pipeline");
    showToast("Lead added");
  }

  function updateLead(id, updates) {
    const updated = leads.map(l => l.id === id ? { ...l, ...updates } : l);
    saveLeads(updated);
    if (selected?.id === id) setSelected({ ...selected, ...updates });
    showToast("Saved");
  }

  function deleteLead(id) {
    saveLeads(leads.filter(l => l.id !== id));
    setView("pipeline");
    setSelected(null);
    showToast("Lead removed");
  }

  function moveStage(lead, dir) {
    const idx = STAGES.indexOf(lead.stage);
    const next = STAGES[idx + dir];
    if (next) updateLead(lead.id, { stage: next });
  }

  const filtered = leads.filter(l => {
    if (filter.stage !== "All" && l.stage !== filter.stage) return false;
    if (filter.language !== "All" && l.language !== filter.language) return false;
    if (filter.type !== "All" && l.type !== filter.type) return false;
    if (search && !`${l.name} ${l.org}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.stage === s);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#64748b" }}>
      Loading your pipeline…
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", minHeight: "100vh", background: "#f8fafc", color: "#1e293b" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1e293b", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #1e40af, #3b82f6)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>I</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>IPSIQ Outreach</span>
          <span style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>IFA Pipeline</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["pipeline", "list"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid", fontSize: 13, cursor: "pointer", fontWeight: view === v ? 600 : 400, background: view === v ? "#1e40af" : "#fff", color: view === v ? "#fff" : "#64748b", borderColor: view === v ? "#1e40af" : "#e2e8f0", transition: "all 0.15s" }}>
              {v === "pipeline" ? "Pipeline" : "List"}
            </button>
          ))}
          <button onClick={() => { setView("add"); setForm(EMPTY_FORM); }} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #3b82f6", fontSize: 13, cursor: "pointer", background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>
            + Add Lead
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {view !== "add" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 24px", display: "flex", gap: 24 }}>
          {STAGES.map(s => (
            <div key={s} style={{ display: "flex", align: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[s], display: "inline-block", marginTop: 5 }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>{s}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{leads.filter(l => l.stage === s).length}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{leads.length} total leads</div>
        </div>
      )}

      {/* Filters */}
      {view !== "add" && view !== "detail" && (
        <div style={{ padding: "12px 24px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or org…" style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, width: 200, outline: "none" }} />
          {[["stage", ["All", ...STAGES]], ["language", ["All", ...LANGUAGES]], ["type", ["All", ...TYPES]]].map(([key, opts]) => (
            <select key={key} value={filter[key]} onChange={e => setFilter({ ...filter, [key]: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, background: "#fff", color: "#374151", outline: "none" }}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* Pipeline View */}
      {view === "pipeline" && (
        <div style={{ overflowX: "auto", padding: "0 24px 24px" }}>
          <div style={{ display: "flex", gap: 12, minWidth: "max-content" }}>
            {STAGES.map(stage => (
              <div key={stage} style={{ width: 220, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS[stage], display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stage}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "1px 7px", borderRadius: 10 }}>{byStage[stage].length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byStage[stage].map(lead => (
                    <div key={lead.id} onClick={() => { setSelected(lead); setView("detail"); setEditMode(false); }} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px", cursor: "pointer", transition: "box-shadow 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{lead.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: lead.language === "FR" ? "#fef3c7" : lead.language === "DE" ? "#dbeafe" : lead.language === "IT" ? "#fce7f3" : "#f0fdf4", color: lead.language === "FR" ? "#92400e" : lead.language === "DE" ? "#1e40af" : lead.language === "IT" ? "#9d174d" : "#166534" }}>
                          {lead.language}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{lead.org}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>{lead.type}</div>
                      {lead.nextAction && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, fontStyle: "italic" }}>→ {lead.nextAction}</div>}
                    </div>
                  ))}
                  {byStage[stage].length === 0 && (
                    <div style={{ border: "1px dashed #e2e8f0", borderRadius: 10, padding: "20px 12px", textAlign: "center", fontSize: 12, color: "#cbd5e1" }}>Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Name", "Organisation", "Type", "Lang", "Stage", "Next Action", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <tr key={lead.id} onClick={() => { setSelected(lead); setView("detail"); setEditMode(false); }} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{lead.name}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{lead.org}</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{lead.type}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: lead.language === "FR" ? "#fef3c7" : "#dbeafe", color: lead.language === "FR" ? "#92400e" : "#1e40af" }}>{lead.language}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: STAGE_COLORS[lead.stage] + "22", color: STAGE_COLORS[lead.stage], fontWeight: 600 }}>{lead.stage}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#f59e0b", fontSize: 12 }}>{lead.nextAction || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{lead.date}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#cbd5e1" }}>No leads match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Form */}
      {view === "add" && (
        <div style={{ maxWidth: 560, margin: "32px auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>Add New Lead</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["name", "Contact Name *"], ["org", "Organisation *"], ["email", "Email"], ["phone", "Phone"]].map(([k, label]) => (
              <div key={k} style={{ gridColumn: k === "name" || k === "org" ? "span 1" : "span 1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            {[["type", "Type", TYPES], ["language", "Language", LANGUAGES], ["stage", "Stage", STAGES]].map(([k, label, opts]) => (
              <div key={k}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <select value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, background: "#fff", outline: "none" }}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Next Action</label>
              <input value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })} placeholder="e.g. Send intro email in DE" style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={addLead} disabled={!form.name || !form.org} style={{ padding: "9px 22px", background: form.name && form.org ? "#1e40af" : "#e2e8f0", color: form.name && form.org ? "#fff" : "#94a3b8", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: form.name && form.org ? "pointer" : "default" }}>
              Add Lead
            </button>
            <button onClick={() => setView("pipeline")} style={{ padding: "9px 16px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Detail View */}
      {view === "detail" && selected && (
        <div style={{ maxWidth: 580, margin: "32px auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{selected.org} · {selected.type}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditMode(!editMode)} style={{ padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, cursor: "pointer", background: editMode ? "#eff6ff" : "#fff", color: editMode ? "#1d4ed8" : "#64748b" }}>
                {editMode ? "Cancel Edit" : "Edit"}
              </button>
              <button onClick={() => deleteLead(selected.id)} style={{ padding: "6px 14px", border: "1px solid #fecaca", borderRadius: 7, fontSize: 12, cursor: "pointer", background: "#fff5f5", color: "#dc2626" }}>
                Delete
              </button>
              <button onClick={() => setView("pipeline")} style={{ padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, cursor: "pointer", background: "#f8fafc", color: "#64748b" }}>
                ← Back
              </button>
            </div>
          </div>

          {/* Stage mover */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: "12px", background: "#f8fafc", borderRadius: 10 }}>
            <button onClick={() => moveStage(selected, -1)} disabled={STAGES.indexOf(selected.stage) === 0} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "#fff" }}>←</button>
            <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 6, background: STAGE_COLORS[selected.stage] + "22", color: STAGE_COLORS[selected.stage] }}>{selected.stage}</span>
            <button onClick={() => moveStage(selected, 1)} disabled={STAGES.indexOf(selected.stage) === STAGES.length - 1} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "#fff" }}>→</button>
          </div>

          {editMode ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["name", "Name"], ["org", "Organisation"], ["email", "Email"], ["phone", "Phone"]].map(([k, label]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={selected[k] || ""} onChange={e => setSelected({ ...selected, [k]: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              {[["language", "Language", LANGUAGES], ["type", "Type", TYPES]].map(([k, label, opts]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                  <select value={selected[k]} onChange={e => setSelected({ ...selected, [k]: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, background: "#fff", outline: "none" }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Next Action</label>
                <input value={selected.nextAction || ""} onChange={e => setSelected({ ...selected, nextAction: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={selected.notes || ""} onChange={e => setSelected({ ...selected, notes: e.target.value })} rows={3} style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <button onClick={() => { updateLead(selected.id, selected); setEditMode(false); }} style={{ padding: "9px 22px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {[["Email", selected.email], ["Phone", selected.phone], ["Language", selected.language], ["Added", selected.date]].map(([label, val]) => val ? (
                <div key={label} style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", width: 80, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{val}</span>
                </div>
              ) : null)}
              {selected.nextAction && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>NEXT ACTION</div>
                  <div style={{ fontSize: 13, color: "#78350f" }}>{selected.nextAction}</div>
                </div>
              )}
              {selected.notes && (
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 3 }}>NOTES</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{selected.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
