import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stats, setStats] = useState({ properties: 0, cases: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, casesRes, timelineRes] = await Promise.all([
          axios.get('/api/properties'),
          axios.get('/api/cases'),
          axios.get('/api/timeline/recent'),
        ]);
        setStats({ properties: propsRes.data.length, cases: casesRes.data.length });
        setTimeline(timelineRes.data);
      } catch (e) {
        console.error('Error fetching dashboard data');
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Total Properties</p>
          <p className="text-3xl font-bold">{stats.properties}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Open Cases</p>
          <p className="text-3xl font-bold">{stats.cases}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">Logged In</p>
          <p className="text-3xl font-bold text-green-600">{user?.firstName} {user?.lastName}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="font-semibold text-lg mb-4">Recent Activity Timeline</h2>
        {timeline.length === 0 && <p className="text-gray-500">No recent activity.</p>}
        <div className="space-y-3">
          {timeline.map((event) => (
            <div key={event.id} className="border-b border-gray-100 pb-3 flex justify-between">
              <div>
                <p className="font-medium text-sm">{event.action}</p>
                <p className="text-sm text-gray-600">{event.details}</p>
                <p className="text-xs text-gray-400">By {event.person?.firstName || 'System'}</p>
              </div>
              <p className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}