import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Cases() {
  const [cases, setCases] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    propertyId: '',
    urgency: 'Medium',
    incidentDate: '',
    location: '',
    witnesses: '',
    incidentDetails: '',
    reporterName: ''
  });

  const fetchData = async () => {
    try {
      // ✅ CHANGED: /api/cases → /api/complaints
      const [cRes, pRes] = await Promise.all([
        axios.get('/api/complaints'),
        axios.get('/api/properties')
      ]);
      setCases(cRes.data);
      setProperties(pRes.data);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!newCase.title || !newCase.propertyId) {
      alert('Please fill Title and Property');
      return;
    }

    // ✅ CHANGED: Map frontend fields to complaint API fields
    const complaintData = {
      tenantName: newCase.reporterName || 'Anonymous',
      tenantEmail: '',
      tenantPhone: '',
      propertyId: newCase.propertyId,
      category: newCase.title,
      severity: newCase.urgency,
      description: newCase.incidentDetails,
      addressLine1: '',
      city: '',
      postcode: '',
      incidentDate: newCase.incidentDate || new Date().toISOString().split('T')[0],
    };

    try {
      // ✅ CHANGED: /api/cases → /api/complaints
      await axios.post('/api/complaints', complaintData);
      setShowModal(false);
      setNewCase({
        title: '',
        propertyId: '',
        urgency: 'Medium',
        incidentDate: '',
        location: '',
        witnesses: '',
        incidentDetails: '',
        reporterName: ''
      });
      fetchData();
    } catch (e) {
      console.error('Error creating complaint:', e);
      alert('Error creating case');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-700">ASB Cases</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          + Report ASB
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Urgency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No complaints found. Report one!
                </td>
              </tr>
            ) : (
              cases.map((c: any) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 font-medium">{c.category || c.title}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.property?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      c.riskLevel === 'Critical' ? 'bg-red-100 text-red-800' :
                      c.riskLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                      c.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {c.riskLevel || c.priority || 'Medium'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {c.status || 'Open'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Create Complaint */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold text-red-700 mb-4">Report ASB Incident</h2>
            <div className="space-y-3">
              <input
                className="w-full border p-2 rounded"
                placeholder="Title *"
                value={newCase.title}
                onChange={e => setNewCase({ ...newCase, title: e.target.value })}
              />
              <select
                className="w-full border p-2 rounded"
                value={newCase.propertyId}
                onChange={e => setNewCase({ ...newCase, propertyId: e.target.value })}
              >
                <option value="">Select Property *</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="border p-2 rounded"
                  value={newCase.urgency}
                  onChange={e => setNewCase({ ...newCase, urgency: e.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={newCase.incidentDate}
                  onChange={e => setNewCase({ ...newCase, incidentDate: e.target.value })}
                />
              </div>
              <input
                className="w-full border p-2 rounded"
                placeholder="Location (e.g. Unit 101, Corridor)"
                value={newCase.location}
                onChange={e => setNewCase({ ...newCase, location: e.target.value })}
              />
              <textarea
                className="w-full border p-2 rounded"
                rows={3}
                placeholder="Detailed Description *"
                value={newCase.incidentDetails}
                onChange={e => setNewCase({ ...newCase, incidentDetails: e.target.value })}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Witnesses (optional)"
                value={newCase.witnesses}
                onChange={e => setNewCase({ ...newCase, witnesses: e.target.value })}
              />
              <input
                className="w-full border p-2 rounded"
                placeholder="Reporter Name"
                value={newCase.reporterName}
                onChange={e => setNewCase({ ...newCase, reporterName: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}