import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roles = user?.roles || [];
  const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

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

  useEffect(() => { fetchComplaint(); }, [id]);

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
          </div>
          <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-sm ${complaint.status === 'Closed' ? 'bg-gray-100 text-gray-700' : complaint.status === 'Escalated' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {complaint.status}
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">Risk: {complaint.riskLevel}</span>
          </div>
        </div>
        <p className="mt-4 text-gray-700">{complaint.description}</p>
        {isStaff && (
          <div className="mt-4 flex gap-2">
            <StatusSelect complaint={complaint} onDone={fetchComplaint} />
            {complaint.status !== 'Escalated' && <EscalateButton complaintId={complaint.id} onDone={fetchComplaint} />}
          </div>
        )}
      </div>

      {isStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvidenceSection complaint={complaint} onDone={fetchComplaint} isStaff={isStaff} />
          <CommunicationSection complaint={complaint} onDone={fetchComplaint} />
          <LetterSection complaint={complaint} onDone={fetchComplaint} />
          <WitnessSection complaint={complaint} onDone={fetchComplaint} />
          <ActionSection complaint={complaint} onDone={fetchComplaint} />
          <MonitoringSection complaint={complaint} onDone={fetchComplaint} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvidenceSection complaint={complaint} onDone={fetchComplaint} isStaff={isStaff} />
          <CommunicationSection complaint={complaint} onDone={fetchComplaint} />
          <WitnessSection complaint={complaint} onDone={fetchComplaint} />
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
                <span className={`px-2 py-1 rounded-full text-xs bg-${i.severity === 'Critical' ? 'red' : 'yellow'}-100 text-${i.severity === 'Critical' ? 'red' : 'yellow'}-800`}>{i.severity}</span>
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

const sectionCard = "bg-white p-6 rounded-xl shadow-sm border";

function StatusSelect({ complaint, onDone }: any) {
  const [status, setStatus] = useState(complaint.status);
  const save = async () => {
    await axios.put(`/api/complaints/${complaint.id}/status`, { status });
    onDone();
  };
  return (
    <div className="flex items-center gap-2">
      <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
        {['Open', 'InProgress', 'Escalated', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
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

function EvidenceSection({ complaint, onDone, isStaff }: any) {
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
    setFile(null); setDesc('');
    onDone();
  };

  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Evidence</h2>
      {isStaff && (
        <div className="space-y-2 mb-4">
          <input type="file" onChange={e => setFile(e.target.files?.[0])} className="block w-full text-sm" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="w-full border p-2 rounded text-sm" />
          <button onClick={upload} disabled={!file || busy} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Upload</button>
        </div>
      )}
      {complaint.evidence?.length === 0 && <p className="text-gray-500">No evidence uploaded.</p>}
      <div className="space-y-2">
        {complaint.evidence?.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">{e.fileName}</p>
              <p className="text-xs text-gray-400">{e.fileType} · {(e.fileSize / 1024).toFixed(1)} KB{e.description ? ` · ${e.description}` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadEvidence(complaint.id, e.id, e.fileName)} className="text-blue-700 text-sm hover:underline">Download</button>
              {isStaff && <button onClick={async () => { await axios.delete(`/api/complaints/${complaint.id}/evidence/${e.id}`); onDone(); }} className="text-red-600 text-sm hover:underline">Delete</button>}
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
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

function CommunicationSection({ complaint, onDone }: any) {
  const [form, setForm] = useState({ type: 'Email', direction: 'Inbound', date: new Date().toISOString().split('T')[0], summary: '', details: '' });
  const add = async () => {
    await axios.post(`/api/complaints/${complaint.id}/communications`, { ...form, date: new Date(form.date) });
    setForm({ ...form, summary: '', details: '' });
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Communications</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border p-2 rounded text-sm">
          {['Email', 'Phone', 'Letter', 'SMS', 'Visit', 'Other'].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })} className="border p-2 rounded text-sm">
          {['Inbound', 'Outbound'].map(t => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border p-2 rounded text-sm" />
        <input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Summary" className="border p-2 rounded text-sm" />
      </div>
      <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Details" className="w-full border p-2 rounded text-sm mb-2" rows={2} />
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
  const [type, setType] = useState('Warning');
  const generate = async () => {
    await axios.post(`/api/complaints/${complaint.id}/letters`, { letterType: type });
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Letters</h2>
      <div className="flex gap-2 mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="border p-2 rounded text-sm">
          {['Warning', 'Legal', 'Notice', 'Right to Rent'].map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={generate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Generate Letter</button>
      </div>
      {complaint.letters?.length === 0 && <p className="text-gray-500">No letters generated.</p>}
      <div className="space-y-2">
        {complaint.letters?.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">{l.letterType} · {l.letterhead}</p>
              <p className="text-xs text-gray-400">{l.sentDate ? `Sent: ${new Date(l.sentDate).toLocaleDateString()}` : 'Not sent'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => downloadLetter(complaint.id, l.id)} className="text-blue-700 text-sm hover:underline">Download PDF</button>
              {!l.sentDate && <button onClick={async () => { await axios.put(`/api/complaints/${complaint.id}/letters/${l.id}/sent`); onDone(); }} className="text-green-700 text-sm hover:underline">Mark as Sent</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function downloadLetter(complaintId: string, letterId: string) {
  const res = await axios.get(`/api/complaints/${complaintId}/letters/${letterId}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = `letter-${letterId}.pdf`; a.click();
  URL.revokeObjectURL(url);
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
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Witness name" className="w-full border p-2 rounded text-sm" />
        <input value={form.contactDetails} onChange={e => setForm({ ...form, contactDetails: e.target.value })} placeholder="Contact details" className="w-full border p-2 rounded text-sm" />
        <textarea value={form.statement} onChange={e => setForm({ ...form, statement: e.target.value })} placeholder="Statement" className="w-full border p-2 rounded text-sm" rows={2} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} /> Anonymous</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={form.digitalAcknowledgement} onChange={e => setForm({ ...form, digitalAcknowledgement: e.target.checked })} /> Digital acknowledgement</label>
        </div>
        <button onClick={add} disabled={!form.name} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Add Witness</button>
      </div>
      <div className="space-y-2">
        {complaint.witnesses?.map((w: any) => (
          <div key={w.id} className="border border-gray-100 rounded-lg p-3">
            <button onClick={() => setExpanded(expanded === w.id ? null : w.id)} className="flex justify-between w-full text-left">
              <p className="font-medium text-sm">{w.anonymous ? 'Anonymous' : w.name} {w.anonymous && <span className="text-xs text-gray-400">(anonymous)</span>}</p>
              <span className="text-xs text-blue-700">{expanded === w.id ? '−' : '+'}</span>
            </button>
            {expanded === w.id && (
              <div className="mt-2 text-sm">
                {w.contactDetails && <p className="text-gray-600">Contact: {w.contactDetails}</p>}
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
  const [form, setForm] = useState({ description: '', ownerId: '', dueDate: '' });
  const add = async () => {
    if (!form.description) return;
    await axios.post(`/api/complaints/${complaint.id}/actions`, { ...form, dueDate: form.dueDate ? new Date(form.dueDate) : null });
    setForm({ description: '', ownerId: '', dueDate: '' });
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
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Action description" className="border p-2 rounded text-sm" />
        <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="border p-2 rounded text-sm" />
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
    await axios.post(`/api/complaints/${complaint.id}/monitoring/request`, { justification });
    setJustification('');
    onDone();
  };
  const decide = async (monitoringId: string, action: 'approve' | 'reject') => {
    await axios.post(`/api/complaints/${complaint.id}/monitoring/${monitoringId}/${action}`);
    onDone();
  };
  return (
    <div className={sectionCard}>
      <h2 className="font-semibold text-lg mb-4">Monitoring &amp; Escalation</h2>
      <div className="flex gap-2 mb-3">
        <input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Justification for monitoring" className="flex-1 border p-2 rounded text-sm" />
        <button onClick={request} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Request</button>
      </div>
      {complaint.monitoring?.length === 0 && <p className="text-gray-500">No monitoring requests.</p>}
      <div className="space-y-2">
        {complaint.monitoring?.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">Status: {m.status}</p>
              {m.justification && <p className="text-xs text-gray-500">{m.justification}</p>}
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
