import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";

// ── Constants ─────────────────────────────────────────────────────────────────
const STAGE_COLORS = {
  "Identified": "#94a3b8",
  "Contacted":  "#60a5fa",
  "Follow-up":  "#f59e0b",
  "Responded":  "#a78bfa",
  "Meeting":    "#34d399",
  "Closed":     "#10b981",
};

function getStageColor(stage) { return STAGE_COLORS[stage] || "#94a3b8"; }

function getLangColor(lang) {
  return {
    FR: { bg: "#fef3c7", text: "#92400e" },
    DE: { bg: "#dbeafe", text: "#1e40af" },
    IT: { bg: "#fce7f3", text: "#9d174d" },
    EN: { bg: "#f0fdf4", text: "#166534" },
  }[lang] || { bg: "#f1f5f9", text: "#64748b" };
}

const inputStyle  = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#1e293b" };
const selectStyle = { ...inputStyle };
const labelStyle  = { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 };

const ROLE_STYLE = {
  admin:    { bg: "#eff6ff", text: "#1d4ed8", label: "Admin" },
  editor:   { bg: "#f0fdf4", text: "#15803d", label: "Editor" },
  readonly: { bg: "#f8fafc", text: "#64748b", label: "Read-only" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, logout, api, loading: authLoading } = useAuth();

  const [leads,     setLeads]     = useState([]);
  const [settings,  setSettings]  = useState({ types: [], languages: [], stages: [] });
  const [dataReady, setDataReady] = useState(false);

  const [view,         setView]         = useState("pipeline");
  const [selected,     setSelected]     = useState(null);
  const [editMode,     setEditMode]     = useState(false);
  const [filter,       setFilter]       = useState({ stage: "All", language: "All", type: "All" });
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState("types");
  const [form,         setForm]         = useState({});

  const canEdit         = user?.role !== "readonly";
  const canDelete       = user?.role === "admin";
  const canManageConfig = user?.role === "admin";
  const canManageUsers  = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api("/api/leads").then(r => r.json()),
      api("/api/settings").then(r => r.json()),
    ]).then(([l, s]) => {
      setLeads(l);
      setSettings(s);
      setDataReady(true);
    }).catch(console.error);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function emptyForm() {
    return {
      name: "", org: "", type: settings.types[0] || "", email: "", phone: "",
      language: settings.languages[0] || "", stage: settings.stages[0] || "",
      notes: "", nextAction: "", date: new Date().toISOString().split("T")[0],
    };
  }

  async function addLead() {
    if (!form.name || !form.org) return;
    const res  = await api("/api/leads", { method: "POST", body: JSON.stringify(form) });
    const lead = await res.json();
    setLeads(prev => [lead, ...prev]);
    setForm(emptyForm());
    setView("pipeline");
    showToast("Lead added ✓");
  }

  async function updateLead(id, updates) {
    const res  = await api(`/api/leads/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    const lead = await res.json();
    setLeads(prev => prev.map(l => l.id === id ? lead : l));
    setSelected(prev => prev?.id === id ? lead : prev);
    showToast("Saved ✓");
  }

  async function deleteLead(id) {
    await api(`/api/leads/${id}`, { method: "DELETE" });
    setLeads(prev => prev.filter(l => l.id !== id));
    setView("pipeline");
    setSelected(null);
    showToast("Lead removed");
  }

  async function saveSettings(newSettings) {
    const res = await api("/api/settings", { method: "PUT", body: JSON.stringify(newSettings) });
    const s   = await res.json();
    setSettings(s);
    showToast("Settings saved ✓");
  }

  function moveStage(lead, dir) {
    const idx  = settings.stages.indexOf(lead.stage);
    const next = settings.stages[idx + dir];
    if (next) updateLead(lead.id, { ...lead, stage: next });
  }

  function exportCSV() {
    const headers = ["Name","Organisation","Type","Email","Phone","Language","Stage","Next Action","Notes","Date"];
    const rows    = leads.map(l =>
      [l.name,l.org,l.type,l.email,l.phone,l.language,l.stage,l.nextAction,l.notes,l.date]
        .map(v => `"${(v||"").replace(/"/g,'""')}"`));
    const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "ipsiq_leads.csv" }).click();
    URL.revokeObjectURL(url);
  }

  const filtered = leads.filter(l => {
    if (filter.stage    !== "All" && l.stage    !== filter.stage)    return false;
    if (filter.language !== "All" && l.language !== filter.language) return false;
    if (filter.type     !== "All" && l.type     !== filter.type)     return false;
    if (search && !`${l.name} ${l.org}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byStage = settings.stages.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.stage === s);
    return acc;
  }, {});

  if (authLoading) return <Spinner />;
  if (!user)       return <LoginPage />;
  if (!dataReady)  return <Spinner label="Loading CRM…" />;

  return (
    <div style={{ fontFamily:"'Inter','Helvetica Neue',sans-serif", minHeight:"100vh", background:"#f1f5f9", color:"#1e293b" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, background:"#1e293b", color:"#fff", padding:"10px 18px", borderRadius:8, fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && canManageConfig && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:480, maxHeight:"80vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Manage Dropdown Lists</h3>
              <button onClick={() => setSettingsOpen(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>×</button>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {[["types","Types"],["languages","Languages"],["stages","Stages"]].map(([k,label]) => (
                <button key={k} onClick={() => setSettingsTab(k)} style={{ padding:"5px 14px", borderRadius:6, border:"1px solid", fontSize:13, cursor:"pointer", fontWeight:settingsTab===k?600:400, background:settingsTab===k?"#1e40af":"#fff", color:settingsTab===k?"#fff":"#64748b", borderColor:settingsTab===k?"#1e40af":"#e2e8f0" }}>
                  {label}
                </button>
              ))}
            </div>
            <EditableList
              items={settings[settingsTab] || []}
              onChange={items => {
                const next = { ...settings, [settingsTab]: items };
                setSettings(next);
                saveSettings(next);
              }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:"linear-gradient(135deg,#1e40af,#3b82f6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14, fontWeight:800 }}>I</span>
          </div>
          <span style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.3px" }}>IPSIQ Outreach CRM</span>
          <span style={{ fontSize:11, color:"#94a3b8", background:"#f1f5f9", padding:"2px 8px", borderRadius:20 }}>Switzerland · IFA &amp; SO Pipeline</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {["pipeline","list"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding:"5px 14px", borderRadius:6, border:"1px solid", fontSize:13, cursor:"pointer", fontWeight:view===v?600:400, background:view===v?"#1e40af":"#fff", color:view===v?"#fff":"#64748b", borderColor:view===v?"#1e40af":"#e2e8f0" }}>
              {v==="pipeline"?"Pipeline":"List"}
            </button>
          ))}
          <button onClick={exportCSV} style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, cursor:"pointer", background:"#f8fafc", color:"#64748b" }}>↓ CSV</button>
          {canManageConfig && (
            <button onClick={() => setSettingsOpen(true)} style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, cursor:"pointer", background:"#f8fafc", color:"#64748b" }}>⚙ Lists</button>
          )}
          {canManageUsers && (
            <button onClick={() => setView("users")} style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, cursor:"pointer", background:view==="users"?"#eff6ff":"#f8fafc", color:view==="users"?"#1d4ed8":"#64748b" }}>👥 Users</button>
          )}
          {canEdit && (
            <button onClick={() => { setForm(emptyForm()); setView("add"); }} style={{ padding:"5px 14px", borderRadius:6, border:"1px solid #3b82f6", fontSize:13, cursor:"pointer", background:"#eff6ff", color:"#1d4ed8", fontWeight:600 }}>+ Add Lead</button>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:4, paddingLeft:12, borderLeft:"1px solid #e2e8f0" }}>
            <span style={{ fontSize:12, color:"#64748b" }}>{user.username}</span>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10, background:ROLE_STYLE[user.role]?.bg, color:ROLE_STYLE[user.role]?.text }}>
              {ROLE_STYLE[user.role]?.label}
            </span>
            <button onClick={logout} style={{ padding:"4px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, cursor:"pointer", background:"#fff", color:"#94a3b8" }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!["add","detail","users"].includes(view) && (
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"10px 24px", display:"flex", gap:20, overflowX:"auto" }}>
          {settings.stages.map(s => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:getStageColor(s), display:"inline-block" }} />
              <span style={{ fontSize:12, color:"#64748b" }}>{s}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{leads.filter(l=>l.stage===s).length}</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto", fontSize:12, color:"#94a3b8", flexShrink:0 }}>{leads.length} total</div>
        </div>
      )}

      {/* Filters */}
      {!["add","detail","users"].includes(view) && (
        <div style={{ padding:"12px 24px", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or org…" style={{ padding:"6px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, width:200, outline:"none", background:"#fff" }} />
          {[["stage",["All",...settings.stages]],["language",["All",...settings.languages]],["type",["All",...settings.types]]].map(([key,opts])=>(
            <select key={key} value={filter[key]} onChange={e=>setFilter(f=>({...f,[key]:e.target.value}))}
              style={{ padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, background:"#fff", color:"#374151", outline:"none" }}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          ))}
          {(filter.stage!=="All"||filter.language!=="All"||filter.type!=="All"||search) && (
            <button onClick={()=>{setFilter({stage:"All",language:"All",type:"All"});setSearch("");}}
              style={{ padding:"6px 12px", border:"1px solid #fca5a5", borderRadius:6, fontSize:12, cursor:"pointer", background:"#fff5f5", color:"#dc2626" }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Pipeline */}
      {view==="pipeline" && (
        <div style={{ overflowX:"auto", padding:"0 24px 32px" }}>
          <div style={{ display:"flex", gap:12, minWidth:"max-content" }}>
            {settings.stages.map(stage=>(
              <div key={stage} style={{ width:224, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
                  <span style={{ width:9, height:9, borderRadius:"50%", background:getStageColor(stage), display:"inline-block" }} />
                  <span style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.6px" }}>{stage}</span>
                  <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8", background:"#e2e8f0", padding:"1px 7px", borderRadius:10 }}>{byStage[stage]?.length||0}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {(byStage[stage]||[]).map(lead=>(
                    <div key={lead.id} onClick={()=>{setSelected(lead);setView("detail");setEditMode(false);}}
                      style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px", cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", transition:"box-shadow 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.10)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"#1e293b", lineHeight:1.3 }}>{lead.name}</div>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, background:getLangColor(lead.language).bg, color:getLangColor(lead.language).text, marginLeft:6, flexShrink:0 }}>{lead.language}</span>
                      </div>
                      <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>{lead.org}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", background:"#f8fafc", padding:"2px 7px", borderRadius:4, display:"inline-block" }}>{lead.type}</div>
                      {lead.nextAction && <div style={{ fontSize:11, color:"#d97706", marginTop:7, fontStyle:"italic", lineHeight:1.4 }}>→ {lead.nextAction}</div>}
                    </div>
                  ))}
                  {(!byStage[stage]||byStage[stage].length===0) && (
                    <div style={{ border:"1px dashed #e2e8f0", borderRadius:10, padding:"22px 12px", textAlign:"center", fontSize:12, color:"#cbd5e1" }}>Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {view==="list" && (
        <div style={{ padding:"0 24px 32px" }}>
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                  {["Name","Organisation","Type","Lang","Stage","Next Action","Date"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"#64748b", fontSize:12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead,i)=>(
                  <tr key={lead.id} onClick={()=>{setSelected(lead);setView("detail");setEditMode(false);}}
                    style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer", background:i%2===0?"#fff":"#fafafa" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                    <td style={{ padding:"10px 14px", fontWeight:600 }}>{lead.name}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{lead.org}</td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{lead.type}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:4, background:getLangColor(lead.language).bg, color:getLangColor(lead.language).text }}>{lead.language}</span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11, padding:"3px 9px", borderRadius:20, background:getStageColor(lead.stage)+"22", color:getStageColor(lead.stage), fontWeight:600 }}>{lead.stage}</span>
                    </td>
                    <td style={{ padding:"10px 14px", color:"#d97706", fontSize:12 }}>{lead.nextAction||"—"}</td>
                    <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{lead.date}</td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#cbd5e1", fontSize:13 }}>No leads match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead */}
      {view==="add" && canEdit && (
        <div style={{ maxWidth:580, margin:"32px auto", background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:28 }}>
          <h2 style={{ margin:"0 0 22px", fontSize:17, fontWeight:700 }}>Add New Lead</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[["name","Contact Name *"],["org","Organisation *"],["email","Email"],["phone","Phone"]].map(([k,label])=>(
              <div key={k}>
                <label style={labelStyle}>{label}</label>
                <input value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type||""} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={selectStyle}>
                {settings.types.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Language</label>
              <select value={form.language||""} onChange={e=>setForm(f=>({...f,language:e.target.value}))} style={selectStyle}>
                {settings.languages.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select value={form.stage||""} onChange={e=>setForm(f=>({...f,stage:e.target.value}))} style={selectStyle}>
                {settings.stages.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inputStyle} />
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <label style={labelStyle}>Next Action</label>
              <input value={form.nextAction||""} onChange={e=>setForm(f=>({...f,nextAction:e.target.value}))} placeholder="e.g. Send intro email in DE" style={inputStyle} />
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{ ...inputStyle, resize:"vertical" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={addLead} disabled={!form.name||!form.org}
              style={{ padding:"9px 22px", background:form.name&&form.org?"#1e40af":"#e2e8f0", color:form.name&&form.org?"#fff":"#94a3b8", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:form.name&&form.org?"pointer":"default" }}>
              Add Lead
            </button>
            <button onClick={()=>setView("pipeline")} style={{ padding:"9px 16px", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:7, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Detail */}
      {view==="detail" && selected && (
        <div style={{ maxWidth:580, margin:"32px auto", background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700 }}>{selected.name}</h2>
              <div style={{ fontSize:13, color:"#64748b" }}>{selected.org} · {selected.type}</div>
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              {canEdit && (
                <button onClick={()=>setEditMode(!editMode)} style={{ padding:"6px 14px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, cursor:"pointer", background:editMode?"#eff6ff":"#fff", color:editMode?"#1d4ed8":"#64748b" }}>
                  {editMode?"Cancel":"Edit"}
                </button>
              )}
              {canDelete && (
                <button onClick={()=>deleteLead(selected.id)} style={{ padding:"6px 14px", border:"1px solid #fecaca", borderRadius:7, fontSize:12, cursor:"pointer", background:"#fff5f5", color:"#dc2626" }}>Delete</button>
              )}
              <button onClick={()=>setView("pipeline")} style={{ padding:"6px 14px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, cursor:"pointer", background:"#f8fafc", color:"#64748b" }}>← Back</button>
            </div>
          </div>

          {canEdit ? (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, padding:"12px 14px", background:"#f8fafc", borderRadius:10 }}>
              <button onClick={()=>moveStage(selected,-1)} disabled={settings.stages.indexOf(selected.stage)===0}
                style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, cursor:settings.stages.indexOf(selected.stage)===0?"default":"pointer", background:"#fff", color:settings.stages.indexOf(selected.stage)===0?"#cbd5e1":"#374151" }}>←</button>
              <span style={{ flex:1, textAlign:"center", fontSize:13, fontWeight:600, padding:"5px 14px", borderRadius:6, background:getStageColor(selected.stage)+"22", color:getStageColor(selected.stage) }}>{selected.stage}</span>
              <button onClick={()=>moveStage(selected,1)} disabled={settings.stages.indexOf(selected.stage)===settings.stages.length-1}
                style={{ padding:"5px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, cursor:settings.stages.indexOf(selected.stage)===settings.stages.length-1?"default":"pointer", background:"#fff", color:settings.stages.indexOf(selected.stage)===settings.stages.length-1?"#cbd5e1":"#374151" }}>→</button>
            </div>
          ) : (
            <div style={{ marginBottom:22, textAlign:"center" }}>
              <span style={{ fontSize:13, fontWeight:600, padding:"6px 16px", borderRadius:6, background:getStageColor(selected.stage)+"22", color:getStageColor(selected.stage) }}>{selected.stage}</span>
            </div>
          )}

          {editMode ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["name","Name"],["org","Organisation"],["email","Email"],["phone","Phone"]].map(([k,label])=>(
                <div key={k}>
                  <label style={labelStyle}>{label}</label>
                  <input value={selected[k]||""} onChange={e=>setSelected(s=>({...s,[k]:e.target.value}))} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Type</label>
                <select value={selected.type} onChange={e=>setSelected(s=>({...s,type:e.target.value}))} style={selectStyle}>
                  {settings.types.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Language</label>
                <select value={selected.language} onChange={e=>setSelected(s=>({...s,language:e.target.value}))} style={selectStyle}>
                  {settings.languages.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label style={labelStyle}>Next Action</label>
                <input value={selected.nextAction||""} onChange={e=>setSelected(s=>({...s,nextAction:e.target.value}))} style={inputStyle} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={selected.notes||""} onChange={e=>setSelected(s=>({...s,notes:e.target.value}))} rows={3} style={{ ...inputStyle, resize:"vertical" }} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <button onClick={()=>{updateLead(selected.id,selected);setEditMode(false);}}
                  style={{ padding:"9px 22px", background:"#1e40af", color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gap:12 }}>
              {[["Email",selected.email],["Phone",selected.phone],["Language",selected.language],["Added",selected.date],["Added by",selected.createdBy]].filter(([,v])=>v).map(([label,val])=>(
                <div key={label} style={{ display:"flex", gap:12, alignItems:"baseline" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#94a3b8", width:80, flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:13, color:"#374151" }}>{val}</span>
                </div>
              ))}
              {selected.nextAction && (
                <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"11px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#92400e", marginBottom:4 }}>NEXT ACTION</div>
                  <div style={{ fontSize:13, color:"#78350f" }}>{selected.nextAction}</div>
                </div>
              )}
              {selected.notes && (
                <div style={{ background:"#f8fafc", borderRadius:8, padding:"11px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:4 }}>NOTES</div>
                  <div style={{ fontSize:13, color:"#475569", lineHeight:1.65 }}>{selected.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {view==="users" && canManageUsers && (
        <UsersPanel api={api} currentUserId={user.id} showToast={showToast} />
      )}
    </div>
  );
}

// ── Users Panel ───────────────────────────────────────────────────────────────
function UsersPanel({ api, currentUserId, showToast }) {
  const [users,     setUsers]     = useState([]);
  const [showAdd,   setShowAdd]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newForm,   setNewForm]   = useState({ username:"", password:"", role:"editor" });
  const [editForm,  setEditForm]  = useState({});
  const [error,     setError]     = useState("");

  useEffect(() => {
    api("/api/users").then(r=>r.json()).then(setUsers);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createUser() {
    setError("");
    const res  = await api("/api/users", { method:"POST", body:JSON.stringify(newForm) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setUsers(prev=>[...prev,data]);
    setNewForm({ username:"", password:"", role:"editor" });
    setShowAdd(false);
    showToast("User created ✓");
  }

  async function saveEdit(id) {
    setError("");
    const res  = await api(`/api/users/${id}`, { method:"PUT", body:JSON.stringify(editForm) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setUsers(prev=>prev.map(u=>u.id===id?data:u));
    setEditingId(null);
    showToast("User updated ✓");
  }

  async function deleteUser(id) {
    await api(`/api/users/${id}`, { method:"DELETE" });
    setUsers(prev=>prev.filter(u=>u.id!==id));
    showToast("User removed");
  }

  const ROLES = ["admin","editor","readonly"];

  return (
    <div style={{ maxWidth:700, margin:"32px auto", padding:"0 24px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>User Management</h2>
        <button onClick={()=>{setShowAdd(true);setError("");}} style={{ padding:"6px 14px", background:"#1e40af", color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Add User</button>
      </div>

      {error && <div style={{ background:"#fff5f5", border:"1px solid #fecaca", borderRadius:7, padding:"9px 12px", fontSize:13, color:"#dc2626", marginBottom:14 }}>{error}</div>}

      {showAdd && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:20, marginBottom:16 }}>
          <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:600 }}>New User</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input value={newForm.username} onChange={e=>setNewForm(f=>({...f,username:e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password (min 8 chars)</label>
              <input type="password" value={newForm.password} onChange={e=>setNewForm(f=>({...f,password:e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={newForm.role} onChange={e=>setNewForm(f=>({...f,role:e.target.value}))} style={selectStyle}>
                {ROLES.map(r=><option key={r} value={r}>{ROLE_STYLE[r]?.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button onClick={createUser} disabled={!newForm.username||!newForm.password}
              style={{ padding:"7px 18px", background:newForm.username&&newForm.password?"#1e40af":"#e2e8f0", color:newForm.username&&newForm.password?"#fff":"#94a3b8", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Create
            </button>
            <button onClick={()=>{setShowAdd(false);setError("");}} style={{ padding:"7px 14px", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:7, fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
              {["Username","Role","Created","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"#64748b", fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u,i)=>(
              <tr key={u.id} style={{ borderBottom:"1px solid #f1f5f9", background:i%2===0?"#fff":"#fafafa" }}>
                <td style={{ padding:"10px 14px", fontWeight:600 }}>
                  {editingId===u.id
                    ? <input value={editForm.username||u.username} onChange={e=>setEditForm(f=>({...f,username:e.target.value}))} style={{ ...inputStyle, width:140 }} />
                    : u.username}
                  {u.id===currentUserId && <span style={{ marginLeft:6, fontSize:10, color:"#94a3b8" }}>(you)</span>}
                </td>
                <td style={{ padding:"10px 14px" }}>
                  {editingId===u.id
                    ? <select value={editForm.role||u.role} onChange={e=>setEditForm(f=>({...f,role:e.target.value}))} style={{ ...selectStyle, width:120 }}>
                        {ROLES.map(r=><option key={r} value={r}>{ROLE_STYLE[r]?.label}</option>)}
                      </select>
                    : <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:10, background:ROLE_STYLE[u.role]?.bg, color:ROLE_STYLE[u.role]?.text }}>{ROLE_STYLE[u.role]?.label}</span>}
                </td>
                <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{u.createdAt?.split("T")[0]}</td>
                <td style={{ padding:"10px 14px" }}>
                  {editingId===u.id ? (
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input type="password" placeholder="New password (optional)" value={editForm.password||""} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} style={{ ...inputStyle, width:190, fontSize:12 }} />
                      <button onClick={()=>saveEdit(u.id)} style={{ padding:"4px 12px", background:"#1e40af", color:"#fff", border:"none", borderRadius:6, fontSize:12, cursor:"pointer" }}>Save</button>
                      <button onClick={()=>{setEditingId(null);setError("");}} style={{ padding:"4px 10px", background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:6, fontSize:12, cursor:"pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{setEditingId(u.id);setEditForm({role:u.role,username:u.username});setError("");}}
                        style={{ padding:"4px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, cursor:"pointer", background:"#fff", color:"#64748b" }}>Edit</button>
                      {u.id!==currentUserId && (
                        <button onClick={()=>deleteUser(u.id)}
                          style={{ padding:"4px 12px", border:"1px solid #fecaca", borderRadius:6, fontSize:12, cursor:"pointer", background:"#fff5f5", color:"#dc2626" }}>Remove</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:12, color:"#94a3b8", marginTop:14 }}>
        <strong>Admin</strong> — full access &nbsp;·&nbsp; <strong>Editor</strong> — add &amp; edit, no delete &nbsp;·&nbsp; <strong>Read-only</strong> — view only
      </p>
    </div>
  );
}

// ── EditableList ──────────────────────────────────────────────────────────────
function EditableList({ items, onChange }) {
  const [newItem, setNewItem] = useState("");

  function addItem() {
    const val = newItem.trim();
    if (val && !items.includes(val)) { onChange([...items,val]); setNewItem(""); }
  }
  function removeItem(item) { onChange(items.filter(i=>i!==item)); }
  function moveItem(index, dir) {
    const arr=[...items], t=index+dir;
    if (t<0||t>=arr.length) return;
    [arr[index],arr[t]]=[arr[t],arr[index]];
    onChange(arr);
  }

  return (
    <div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
        {items.map((item,i)=>(
          <div key={item} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"#f8fafc", borderRadius:7, border:"1px solid #e2e8f0" }}>
            <span style={{ flex:1, fontSize:13, color:"#374151" }}>{item}</span>
            <button onClick={()=>moveItem(i,-1)} disabled={i===0}               style={{ border:"none", background:"none", cursor:i===0?"default":"pointer", color:i===0?"#cbd5e1":"#94a3b8", fontSize:14, padding:"0 4px" }}>↑</button>
            <button onClick={()=>moveItem(i,1)}  disabled={i===items.length-1}  style={{ border:"none", background:"none", cursor:i===items.length-1?"default":"pointer", color:i===items.length-1?"#cbd5e1":"#94a3b8", fontSize:14, padding:"0 4px" }}>↓</button>
            <button onClick={()=>removeItem(item)} style={{ border:"none", background:"none", cursor:"pointer", color:"#fca5a5", fontSize:16, padding:"0 4px" }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()}
          placeholder="Add new item…" style={{ flex:1, padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:13, outline:"none" }} />
        <button onClick={addItem} style={{ padding:"8px 16px", background:"#1e40af", color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }}>Add</button>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ label="Loading…" }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f1f5f9", fontFamily:"'Inter',sans-serif", color:"#94a3b8", fontSize:14 }}>
      {label}
    </div>
  );
}
