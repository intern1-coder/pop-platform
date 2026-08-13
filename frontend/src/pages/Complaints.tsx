import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Complaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/complaints', { params: { page: 1, limit: 25 } })
      .then(res => setComplaints(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const badge = (text: string, color: string) => (
    <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{text}</span>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700">Complaints</h1>
        <Link to="/cases" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Report ASB
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : complaints.length === 0 ? (
        <p className="text-gray-500">No complaints found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Property</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {complaints.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/complaints/${c.id}`} className="font-medium text-blue-700 hover:underline">
                      {c.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.tenantName}</td>
                  <td className="px-6 py-4">{c.category}</td>
                  <td className="px-6 py-4">
                    {c.riskLevel === 'Critical' ? badge(c.riskLevel, 'bg-red-100 text-red-800') :
                     c.riskLevel === 'High' ? badge(c.riskLevel, 'bg-orange-100 text-orange-800') :
                     c.riskLevel === 'Medium' ? badge(c.riskLevel, 'bg-yellow-100 text-yellow-800') :
                     badge(c.riskLevel || 'Low', 'bg-green-100 text-green-800')}
                  </td>
                  <td className="px-6 py-4">
                    {c.status === 'Closed' ? badge(c.status, 'bg-gray-100 text-gray-700') :
                     c.status === 'Escalated' ? badge(c.status, 'bg-red-100 text-red-800') :
                     badge(c.status || 'Open', 'bg-blue-100 text-blue-800')}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.property?.name || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
