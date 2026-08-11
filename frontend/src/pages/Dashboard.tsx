import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error);
  }, []);

  const cards = stats ? [
    { label: 'Total Properties', value: stats.totalProperties, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Open Cases', value: stats.openCases, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Pending Actions', value: stats.pendingActions, color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: 'Incidents', value: stats.totalIncidents, color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: 'Active Monitoring', value: stats.activeMonitoring, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Total Complaints', value: stats.totalComplaints, color: 'text-red-700', bg: 'bg-red-50' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-600 bg-white border rounded-lg px-4 py-2">
          Logged in as <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{user?.roles?.join(', ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-5 border`}>
            <p className="text-sm text-gray-600">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold text-lg mb-4">Recent Activity</h2>
        {!stats ? (
          <p className="text-gray-500">Loading...</p>
        ) : stats.recentActivity.length === 0 ? (
          <p className="text-gray-500">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentActivity.map((event: any) => (
              <div key={event.id} className="border-b border-gray-100 pb-3 flex justify-between">
                <div>
                  <p className="font-medium text-sm">{event.action}</p>
                  <p className="text-sm text-gray-600">{event.details}</p>
                  <p className="text-xs text-gray-400">
                    By {event.person?.firstName || 'System'} · {event.complaint?.reference || 'Case'}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
