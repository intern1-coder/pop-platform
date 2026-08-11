import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ASB_LETTER_OPTIONS = [
  { value: 'first_warning', label: 'First Warning' },
  { value: 'final_warning', label: 'Final Warning' },
  { value: 'notice_seeking_possession', label: 'Notice Seeking Possession (S8)' },
];

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [complaint, setComplaint] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roles = user?.roles || [];
  const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

  const fetchMeta = async () => {
    if (!isStaff) return;
    try {
      const res = await axios.get('/api/meta/asb');
      setMeta(res.data);
    } catch (e) {
      console.error('meta load error', e);
    }
  };

  const fetchComplaint = async () => {
    try {
      const res = await axios.get(`/api/complaints/${id}`);
      setComplaint(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refresh = () => {
    fetchComplaint();
  };

  const downloadFile = async (url: string, filename: string) => {
    const res = await axios.get(url, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!complaint) return <p className="text-gray-500">Not found</p>;

  return (
    <div className="space-y-6">
      <Link to="/complaints" className="text-blue-700 text-sm">&larr; Back to complaints</Link>

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">{complaint.reference}</h1>
            <p className="text-gray-600">{complaint.category} · {complaint.property?.name} · {complaint.addressLine1}, {complaint.city} {complaint.postcode}</p>
            <p className="text-sm text-gray-500 mt-1">Tenant: {complaint.tenantName} · Incident: {new Date(complaint.incidentDate).toLocaleDateString()}</p>
            {complaint.branch && <p className="text-xs text-gray-400 mt-0.5">Branch: {complaint.branch}</p>}
            {complaint.landlordName && <p className="text-xs text-gray-400">Landlord: {complaint.landlordName}</p>}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm ${complaint.status === 'Closed' ? 'bg-gray-100 text-gray-700' : complaint.status === 'Escalated' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {complaint.status}
            </span>
            <RiskChip score={complaint.riskScore} level={complaint.riskLevel} factors={complaint.riskFactors} />
            {complaint.monitoringStatus && (
              <span className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Monitoring: {complaint.monitoringStatus}
              </span>
            )}
          </div>
        </div>
        <p className="mt-4 text-gray-700">{complaint.description}</p>

        {/* Notice / outcome fields (staff) */}
        {isStaff && complaint.noticeGround && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Section 8 Ground:</span> {complaint.noticeGround === '14' ? 'Ground 14 (ASB - immediate)' : complaint.noticeGround === '12' ? 'Ground 12 (tenancy breach - 14 days)' : complaint.noticeGround}</div>
            {complaint.noticeServedDate && <div><span className="text-gray-500">Notice Served:</span> {new Date(complaint.noticeServedDate).toLocaleDateString()}</div>}
            {complaint.noticeExpiresDate && <div><span className="text-gray-500">Notice Expires:</span> {new Date(complaint.noticeExpiresDate).toLocaleDateString()}</div>}
            {complaint.rentArrearsAmount != null && <div><span className="text-gray-500">Rent Arrears:</span> £{complaint.rentArrearsAmount.toFixed(2)}</div>}
            {complaint.closedReason && <div><span className="text-gray-500">Closed Reason:</span> {complaint.closedReason}</div>}
            {complaint.outcome && <div><span className="text-gray-500">Outcome:</span> {complaint.outcome}</div>}
          </div>
        )}

        {isStaff && (
          <div className="mt-4 flex gap-2 flex-wrap items-center">
            <StatusSelect complaint={complaint} onDone={refresh} />
            {complaint.status !== 'Escalated' && <EscalateButton complaintId={complaint.id} onDone={refresh} />}
          </div>
        )}
      </div>

      {/* SLA visit status (staff) */}
      {isStaff && <SlaSection complaint={complaint} onDone={refresh} />}

      {/* ASB details editor (staff): risk factors + notice fields + branch */}
      {isStaff && <AsbDetailsSection complaint={complaint} meta={meta} onDone={refresh} />}

      {isStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvidenceSection complaint={complaint} onDone={refresh} isStaff={isStaff} />
          <CommunicationSection complaint={complaint} onDone={refresh} />
          <LetterSection complaint={complaint} onDone={refresh} />
          <ExternalSection complaint={complaint} onDone={refresh} />
          <WitnessSection complaint={complaint} onDone={refresh} />
          <ActionSection complaint={complaint} onDone={refresh} />
          <MonitoringSection complaint={complaint} onDone={refresh} />
          <CourtPackSection complaint={complaint} onDone={refresh} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvidenceSection complaint={complaint} onDone={refresh} isStaff={isStaff} />
          <CommunicationSection complaint={complaint} onDone={refresh} />
          <WitnessSection complaint={complaint} onDone={refresh} />
        </div>
      )}

      {/* Incidents */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold text-lg mb-4">Incidents</h2>
        {complaint.incidents?.length === 0 && <p className="text-gray-500">No incidents logged.</p>}
        <div className="space-y-3">
          {complaint.incidents?.map((i: any) => (
            <div key={i.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between">
                <p className="font-medium">{i.category}</p>
                <span className={`px-2 py-1 rounded-full text-xs ${i.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{i.severity}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{i.description}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(i.incidentDate).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="font-semibold text-lg mb-4">Timeline</h2>
          {complaint.timelineEvents?.length === 0 && <p className="text-gray-500">No activity yet.</p>}
          <div className="space-y-3">
            {complaint.timelineEvents?.map((e: any) => (
              <div key={e.id} className="border-l-2 border-blue-200 pl-3">
                <p className="font-medium text-sm">{e.action}</p>
                <p className="text-sm text-gray-600">{e.details}</p>
                <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()} · {e.person?.firstName || 'System'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="font-semibold text-lg mb-4">Audit Log</h2>
          {complaint.auditLogs?.length === 0 && <p className="text-gray-500">No audit entries.</p>}
          <div className="space-y-3">
            {complaint.auditLogs?.map((a: any) => (
              <div key={a.id} className="border-b border-gray-100 pb-2">
                <p className="font-medium text-sm">{a.action}</p>
                <p className="text-xs text-gray-500">{a.details}</p>
                <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionCard = 'bg-white p-6 rounded-xl shadow-sm border';

function RiskChip({ score, level, factors }: any) {
  const color =
    level === 'Critical'
      ? 'bg-red-100 text-red-800'
      : level === 'High'
        ? 'bg-orange-100 text-orange-800'
        : level === 'Medium'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-green-100 text-green-800';
  const label = factors ? `${level} (${score}) — ${factors.split(',').length} risk factor(s)` : `Risk: ${level} (${score})`;
  return <span className={`px-3 py-1 rounded-full text-sm ${color}`}>{label}</span>;
}

function StatusSelect({ complaint, onDone }: any) {
  const [status, setStatus] = useState(complaint.status);
  const save = async () => {
    await axios.put(`/api/complaints/${complaint.id}/status`, { status });
    onDone();
  };
  return (
    <div className="flex items-center gap-2">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
        {['Open', 'InProgress', 'UnderReview', 'Resolved', 'Closed'].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button onClick={save} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Update Status</button>
    </div>
  );
}

function EscalateButton({ complaintId, onDone }: any) {
  const [busy, setBusy] = useState(false);
  const escalate = async () => {
    if (!confirm('Escalate this complaint to senior team/legal?')) return;
    setBusy(true);
    await axios.post(`/api/complaints/${complaintId}/escalation`);
    setBusy(false);
    onDone();
  };
  return (
    <button onClick={escalate} disabled={busy} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
      Escalate
    </button>
  );
}

// Staff-only editor: risk factors, notice ground / served date, rent arrears, branch,
// closed reason + outcome. Saving recomputes the weighted risk score server-side.
function AsbDetailsSection({ complaint, meta, onDone }: any) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    riskFactors: complaint.riskFactors || '',
    branch: complaint.branch || '',
    assignedPmEmail: complaint.assignedPmEmail || '',
    noticeGround: complaint.noticeGround || '',
    noticeServedDate: complaint.noticeServedDate ? new Date(complaint.noticeServedDate).toISOString().slice(0, 10) : '',
    noticeExpiresDate: complaint.noticeExpiresDate ? new Date(complaint.noticeExpiresDate).toISOString().slice(0, 10) : '',
    rentArrearsAmount: complaint.rentArrearsAmount != null ? String(complaint.rentArrearsAmount) : '',
    closedReason: complaint.closedReason || '',
    outcome: complaint.outcome || '',
  });

  const toggleFactor = (key: string) => {
    const current = fields.riskFactors ? fields.riskFactors.split(',').map((f: string) => f.trim()) : [];
    const next = current.includes(key) ? current.filter((f: string) => f !== key) : [...current, key];
    setFields({ ...fields, riskFactors: next.join(',') });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...fields };
      if (payload.riskFactors === '') payload.riskFactors = null;
      if (payload.noticeServedDate === '') payload.noticeServedDate = null;
      if (payload.noticeExpiresDate === '') payload.noticeExpiresDate = null;
      if (payload.rentArrearsAmount === '') payload.rentArrearsAmount = null;
      else payload.rentArrearsAmount = parseFloat(payload.rentArrearsAmount);
      await axios.put(`/api/complaints/${complaint.id}`, payload);
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const factorKeys: string[] = meta?.riskFactors?.map((f: any) => f.key) || [];
  const factorLabels: Record<string, string> = {};
  meta?.riskFactors?.forEach((f: any) => {
    factorLabels[f.key] = f.label;
  });

  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">ASB Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-gray-500 mb-1">Risk factors</label>
          <div className="flex flex-wrap gap-2">
            {factorKeys.map((key) => {
              const label = factorLabels[key] || key;
              const active = fields.riskFactors ? fields.riskFactors.split(',').map((f: string) => f.trim()).includes(key) : false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFactor(key)}
                  className={`px-2 py-1 rounded text-xs border ${active ? 'bg-blue-100 border-blue-600 text-blue-800' : 'bg-gray-50 text-gray-600'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Branch</label>
          <input value={fields.branch} onChange={(e) => setFields({ ...fields, branch: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Section 8 Ground</label>
          <select value={fields.noticeGround} onChange={(e) => setFields({ ...fields, noticeGround: e.target.value })} className="w-full border p-2 rounded text-sm">
            <option value="">None</option>
            <option value="12">Ground 12 — tenancy breach (14 days)</option>
            <option value="14">Ground 14 — ASB / nuisance (immediate)</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Notice Served</label>
          <input type="date" value={fields.noticeServedDate} onChange={(e) => setFields({ ...fields, noticeServedDate: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Notice Expires</label>
          <input type="date" value={fields.noticeExpiresDate} onChange={(e) => setFields({ ...fields, noticeExpiresDate: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Rent Arrears (£)</label>
          <input value={fields.rentArrearsAmount} onChange={(e) => setFields({ ...fields, rentArrearsAmount: e.target.value })} className="w-full border p-2 rounded text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-gray-500 mb-1">Assigned PM email</label>
          <input value={fields.assignedPmEmail} onChange={(e) => setFields({ ...fields, assignedPmEmail: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-gray-500 mb-1">Closed Reason</label>
          <input value={fields.closedReason} onChange={(e) => setFields({ ...fields, closedReason: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-gray-500 mb-1">Outcome</label>
          <input value={fields.outcome} onChange={(e) => setFields({ ...fields, outcome: e.target.value })} className="w-full border p-2 rounded text-sm" />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-4 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save ASB Details'}
      </button>
    </div>
  );
}

// Visit SLA: warns when a case hasn't been touched within its severity window.
function SlaSection({ complaint, onDone }: any) {
  const [sla, setSla] = useState<any>(null);
  useEffectFetchSla(complaint, setSla);
  if (!sla) return null;
  const ragColor = sla.rag === 'red' ? 'bg-red-100 text-red-800' : sla.rag === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="font-semibold text-lg mb-4">Visit SLA</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${ragColor}`}>{sla.rag.toUpperCase()}</span>
          <span>Visit due {sla.dueStr} ({sla.windowDays} working days) — managed by {sla.managedBy}</span>
        </div>
        <div className="text-right">
          {sla.overdue ? <span className="text-red-600 font-medium">Overdue</span> : `${sla.addressed ? 'Action logged' : 'No action yet'} — ${sla.pct}% of window elapsed`}
        </div>
      </div>
    </div>
  );
}

function useEffectFetchSla(complaint: any, setSla: (v: any) => void) {
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/complaints/${complaint.id}/sla`)
      .then((res) => {
        if (!cancelled) setSla(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [complaint.id]);
}

// Court pack checklist + case export.
function CourtPackSection({ complaint, onDone }: any) {
  const [pack, setPack] = useState<any>(null);
  const load = async () => {
    const res = await axios.get(`/api/complaints/${complaint.id}/export`);
    setPack(res.data);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint.id]);

  const download = () => {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${complaint.reference}-case-pack.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pack) return null;
  const passed = pack.checklist.filter((c: any) => c.pass).length;
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Court Pack</h2>
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-1 rounded-full text-xs ${pack.courtReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {pack.courtReady ? 'Court Ready' : 'Not Court Ready'}
        </span>
        <span className="text-sm text-gray-500">{passed}/{pack.checklist.length} checks passed</span>
      </div>
      <ul className="space-y-1 text-sm">
        {pack.checklist.map((c: any) => (
          <li key={c.key} className="flex justify-between">
            <span>{c.label}</span>
            <span className={`text-xs ${c.pass ? 'text-green-700' : 'text-red-700'}`}>{c.pass ? '✓' : '✗'}</span>
          </li>
        ))}
      </ul>
      <button onClick={download} className="mt-3 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
        Export Case Pack (JSON)
      </button>
    </div>
  );
}

function EvidenceSection({ complaint, onDone, isStaff = true }: any) {
  const [file, setFile] = useState<any>(null);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', desc);
    setBusy(true);
    await axios.post(`/api/complaints/${complaint.id}/evidence`, fd);
    setBusy(false);
    setFile(null);
    setDesc('');
    onDone();
  };

  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Evidence</h2>
      {isStaff && (
        <div className="space-y-2 mb-4">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0])} className="block w-full text-sm" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-full border p-2 rounded text-sm" />
          <button onClick={upload} disabled={!file || busy} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Upload</button>
        </div>
      )}
      {complaint.evidence?.length === 0 && <p className="text-gray-500">No evidence uploaded.</p>}
      <div className="space-y-2">
        {complaint.evidence?.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">{e.fileName}</p>
              <p className="text-xs text-gray-400">{e.fileType} · {(e.fileSize / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadEvidence(complaint.id, e.id, e.fileName)} className="text-blue-700 text-sm hover:underline">Download</button>
              {isStaff && (
                <button
                  onClick={async () => {
                    await axios.delete(`/api/complaints/${complaint.id}/evidence/${e.id}`);
                    onDone();
                  }}
                  className="text-red-600 text-sm hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function downloadEvidence(complaintId: string, evidenceId: string, fileName: string) {
  const res = await axios.get(`/api/complaints/${complaintId}/evidence/${evidenceId}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function CommunicationSection({ complaint, onDone }: any) {
  const [form, setForm] = useState({ type: 'Email', direction: 'Inbound', date: new Date().toISOString().split('T')[0], summary: '', details: '' });
  const add = async () => {
    if (!form.summary) return;
    await axios.post(`/api/complaints/${complaint.id}/communications`, { ...form, date: new Date(form.date) });
    setForm({ ...form, summary: '', details: '' });
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Communications</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border p-2 rounded text-sm">
          {['Email', 'Phone', 'Letter', 'SMS', 'Visit', 'Other'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="border p-2 rounded text-sm">
          {['Inbound', 'Outbound'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border p-2 rounded text-sm" />
        <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Summary" className="border p-2 rounded text-sm" />
      </div>
      <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Details" className="w-full border p-2 rounded text-sm mb-2" rows={2} />
      <button onClick={add} disabled={!form.summary} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Add Communication</button>
      <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
        {complaint.communications?.map((c: any) => (
          <div key={c.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex justify-between">
              <p className="font-medium text-sm">{c.type} · {c.direction}</p>
              <p className="text-xs text-gray-400">{new Date(c.date).toLocaleString()}</p>
            </div>
            <p className="text-sm text-gray-700 mt-1">{c.summary}</p>
            {c.details && <p className="text-xs text-gray-500 mt-1">{c.details}</p>}
          </div>
        ))}
        {complaint.communications?.length === 0 && <p className="text-gray-500">No communications.</p>}
      </div>
    </div>
  );
}

function LetterSection({ complaint, onDone }: any) {
  const [type, setType] = useState('first_warning');
  const [mode, setMode] = useState<'generic' | 'named'>('named');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [pc2, setPc2] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [sendMap, setSendMap] = useState<Record<string, string>>({});

  const generate = async () => {
    setGenBusy(true);
    try {
      await axios.post(`/api/complaints/${complaint.id}/letters`, {
        letterType: type,
        mode,
        tenantIds: mode === 'named' ? selectedTenants : undefined,
      });
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Generation failed');
    } finally {
      setGenBusy(false);
    }
  };

  const markSent = async (letterId: string, method: string) => {
    try {
      await axios.put(`/api/complaints/${complaint.id}/letters/${letterId}/sent`, {
        sentMethod: method,
        certificateOfPostingDate: method === 'post' && pc2 ? pc2 : undefined,
      });
      setPc2('');
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Mark sent failed');
    }
  };

  const multiTenant = (complaint.tenants || []).length > 1;

  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Letters</h2>
      <div className="space-y-3 mb-4">
        <div className="flex gap-2 items-end flex-wrap">
          <select value={type} onChange={(e) => setType(e.target.value)} className="border p-2 rounded text-sm">
            {ASB_LETTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {multiTenant && (
            <>
              <label className="flex gap-2 items-center text-sm">
                <input type="radio" name={`mode-${complaint.id}`} checked={mode === 'generic'} onChange={() => setMode('generic')} disabled={type === 'notice_seeking_possession'} />
                <span>To The Occupiers (whole property, post only)</span>
              </label>
              <label className="flex gap-2 items-center text-sm">
                <input type="radio" name={`mode-${complaint.id}`} checked={mode === 'named'} onChange={() => setMode('named')} />
                <span>Select tenants</span>
              </label>
            </>
          )}
        </div>
        {multiTenant && mode === 'named' && (
          <div className="flex flex-wrap gap-2 text-sm">
            {(complaint.tenants || []).map((t: any) => (
              <label key={t.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  value={t.id}
                  checked={selectedTenants.includes(t.id)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selectedTenants, t.id] : selectedTenants.filter((x) => x !== t.id);
                    setSelectedTenants(next);
                  }}
                />
                {t.tenantName}
              </label>
            ))}
          </div>
        )}
        <button onClick={generate} disabled={genBusy} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {genBusy ? 'Generating...' : 'Generate Letter'}
        </button>
      </div>
      {complaint.letters?.length === 0 && <p className="text-gray-500">No letters generated.</p>}
      <div className="space-y-3">
        {complaint.letters?.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">{l.letterType.replace(/_/g, ' ')} · {l.letterhead}</p>
              <p className="text-xs text-gray-400">
                {l.isGeneric ? 'To The Occupiers' : `To: ${l.tenantName || complaint.tenantName}`}
                {l.sentDate ? ` · Sent: ${new Date(l.sentDate).toLocaleDateString()} (${l.sentMethod})` : ' · Not sent'}
                {l.certificateOfPostingDate && ` · PC2: ${new Date(l.certificateOfPostingDate).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => downloadLetter(complaint.id, l.id)} className="text-blue-700 text-sm hover:underline">Download PDF</button>
              {!l.sentDate && (
                <div className="flex items-center gap-2">
                  <select
                    value={sendMap[l.id] || 'post'}
                    onChange={(e) => setSendMap({ ...sendMap, [l.id]: e.target.value })}
                    className="border p-1 rounded text-xs"
                  >
                    <option value="post">Post</option>
                    {complaint.tenantEmail ? <option value="email">Email</option> : null}
                    <option value="hand_delivered">Hand Delivered</option>
                  </select>
                  {sendMap[l.id] === 'post' && (
                    <input
                      type="date"
                      value={pc2}
                      onChange={(e) => setPc2(e.target.value)}
                      className="border p-1 rounded text-xs w-28"
                      placeholder="PC2 date"
                    />
                  )}
                  <button
                    onClick={() => markSent(l.id, sendMap[l.id] || 'post')}
                    className="text-green-700 text-xs hover:underline"
                  >
                    Mark Sent
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadLetter(complaintId: string, letterId: string) {
  axios
    .get(`/api/complaints/${complaintId}/letters/${letterId}/file`, { responseType: 'blob' })
    .then((res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letter-${letterId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
}

function ExternalSection({ complaint, onDone }: any) {
  const [form, setForm] = useState({
    bodyType: 'Police',
    cadNumber: '',
    referenceNumber: '',
    officerName: '',
    forceName: '',
    dateReported: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const add = async () => {
    if (!form.bodyType) return;
    await axios.post(`/api/complaints/${complaint.id}/external`, { ...form, dateReported: new Date(form.dateReported) });
    setForm({ bodyType: 'Police', cadNumber: '', referenceNumber: '', officerName: '', forceName: '', dateReported: new Date().toISOString().split('T')[0], notes: '' });
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Police / External References</h2>
      <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
        <select value={form.bodyType} onChange={(e) => setForm({ ...form, bodyType: e.target.value })} className="border p-2 rounded text-sm">
          {['Police', 'Local Council', 'Housing Association', 'Social Services', 'Other'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input value={form.cadNumber} onChange={(e) => setForm({ ...form, cadNumber: e.target.value })} placeholder="CAD / CRN number" className="border p-2 rounded text-sm" />
        <input value={form.officerName} onChange={(e) => setForm({ ...form, officerName: e.target.value })} placeholder="Officer name" className="border p-2 rounded text-sm" />
        <input value={form.forceName} onChange={(e) => setForm({ ...form, forceName: e.target.value })} placeholder="Force / organisation" className="border p-2 rounded text-sm" />
        <input type="date" value={form.dateReported} onChange={(e) => setForm({ ...form, dateReported: e.target.value })} className="border p-2 rounded text-sm" />
        <input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="Reference number" className="border p-2 rounded text-sm" />
      </div>
      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full border p-2 rounded text-sm mb-2" rows={2} />
      <button onClick={add} disabled={!form.bodyType} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Add Reference</button>
      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
        {complaint.external?.map((e: any) => (
          <div key={e.id} className="border border-gray-100 rounded-lg p-2 text-sm">
            <span className="font-medium">{e.bodyType}</span>
            {e.cadNumber && <span> · CAD: {e.cadNumber}</span>}
            {e.referenceNumber && <span> · CRN: {e.referenceNumber}</span>}
            {e.officerName && <span> · {e.officerName}</span>}
            {e.forceName && <span> ({e.forceName})</span>}
            {e.dateReported && <span> · {new Date(e.dateReported).toLocaleDateString()}</span>}
            {e.notes && <p className="text-xs text-gray-500">{e.notes}</p>}
          </div>
        ))}
        {complaint.external?.length === 0 && <p className="text-gray-500">No external references.</p>}
      </div>
    </div>
  );
}

function WitnessSection({ complaint, onDone }: any) {
  const [form, setForm] = useState({ name: '', contactDetails: '', statement: '', anonymous: false, digitalAcknowledgement: false });
  const [expanded, setExpanded] = useState<string | null>(null);
  const add = async () => {
    if (!form.name) return;
    await axios.post(`/api/complaints/${complaint.id}/witnesses`, form);
    setForm({ name: '', contactDetails: '', statement: '', anonymous: false, digitalAcknowledgement: false });
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Witnesses</h2>
      <div className="space-y-2 mb-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Witness name" className="w-full border p-2 rounded text-sm" />
        <input value={form.contactDetails} onChange={(e) => setForm({ ...form, contactDetails: e.target.value })} placeholder="Contact details" className="w-full border p-2 rounded text-sm" />
        <textarea value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} placeholder="Statement" className="w-full border p-2 rounded text-sm" rows={2} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> Anonymous</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.digitalAcknowledgement} onChange={(e) => setForm({ ...form, digitalAcknowledgement: e.target.checked })} /> Digital acknowledgement</label>
        </div>
        <button onClick={add} disabled={!form.name} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Add Witness</button>
      </div>
      <div className="space-y-2">
        {complaint.witnesses?.map((w: any) => (
          <div key={w.id} className="border border-gray-100 rounded-lg p-3">
            <button onClick={() => setExpanded(expanded === w.id ? null : w.id)} className="flex justify-between w-full text-left">
              <p className="font-medium text-sm">{w.anonymous ? 'Anonymous' : w.name} {w.anonymous && <span className="text-xs text-gray-400">(anonymous)</span>}</p>
              <span className="text-xs text-blue-700">{expanded === w.id ? '-' : '+'}</span>
            </button>
            {expanded === w.id && (
              <div className="mt-2 text-sm">
                {w.contactDetails && !w.anonymous && <p className="text-gray-600">Contact: {w.contactDetails}</p>}
                {w.statement && <p className="text-gray-700 mt-1">{w.statement}</p>}
                {w.digitalAcknowledgement && <p className="text-xs text-green-700 mt-1">✓ Digitally acknowledged</p>}
              </div>
            )}
          </div>
        ))}
        {complaint.witnesses?.length === 0 && <p className="text-gray-500">No witnesses recorded.</p>}
      </div>
    </div>
  );
}

function ActionSection({ complaint, onDone }: any) {
  const [form, setForm] = useState({ description: '', dueDate: '' });
  const add = async () => {
    if (!form.description) return;
    await axios.post(`/api/complaints/${complaint.id}/actions`, { ...form, dueDate: form.dueDate ? new Date(form.dueDate) : null });
    setForm({ description: '', dueDate: '' });
    onDone();
  };
  const cycle = async (action: any) => {
    const next = action.status === 'Pending' ? 'InProgress' : 'Completed';
    await axios.put(`/api/complaints/${complaint.id}/actions/${action.id}`, { status: next });
    onDone();
  };
  const statusBadge = (s: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs ${s === 'Completed' ? 'bg-green-100 text-green-800' : s === 'InProgress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{s}</span>
  );
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Actions</h2>
      <div className="grid grid-cols-1 gap-2 mb-3">
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Action description" className="border p-2 rounded text-sm" />
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="border p-2 rounded text-sm" />
        <button onClick={add} disabled={!form.description} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Add Action</button>
      </div>
      <div className="space-y-2">
        {complaint.actions?.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">{a.description}</p>
              <p className="text-xs text-gray-400">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}{a.owner ? ` · ${a.owner.firstName} ${a.owner.lastName}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(a.status)}
              {a.status !== 'Completed' && <button onClick={() => cycle(a)} className="text-blue-700 text-xs hover:underline">Advance</button>}
            </div>
          </div>
        ))}
        {complaint.actions?.length === 0 && <p className="text-gray-500">No actions.</p>}
      </div>
    </div>
  );
}

function MonitoringSection({ complaint, onDone }: any) {
  const [justification, setJustification] = useState('');
  const request = async () => {
    try {
      await axios.post(`/api/complaints/${complaint.id}/monitoring/request`, { justification });
      setJustification('');
      onDone();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Monitoring request failed');
    }
  };
  const decide = async (monitoringId: string, action: 'approve' | 'reject') => {
    await axios.post(`/api/complaints/${complaint.id}/monitoring/${monitoringId}/${action}`);
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Monitoring &amp; Escalation</h2>
      <div className="flex gap-2 mb-3">
        <input value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Justification (warning letter must already be sent)" className="flex-1 border p-2 rounded text-sm" />
        <button onClick={request} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Request</button>
      </div>
      {complaint.monitoring?.length === 0 && <p className="text-gray-500">No monitoring requests.</p>}
      <div className="space-y-2">
        {complaint.monitoring?.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">Status: {m.status}</p>
              {m.justification && <p className="text-xs text-gray-500">{m.justification}</p>}
              {m.expiresAt && <p className="text-xs text-gray-400">Expires: {new Date(m.expiresAt).toLocaleDateString()}</p>}
            </div>
            {m.status === 'Requested' && (
              <div className="flex gap-2">
                <button onClick={() => decide(m.id, 'approve')} className="text-green-700 text-xs hover:underline">Approve</button>
                <button onClick={() => decide(m.id, 'reject')} className="text-red-600 text-xs hover:underline">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
