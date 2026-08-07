import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProp, setNewProp] = useState({ name: '', address: '', type: 'Residential' });

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/properties');
      setProperties(res.data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      await axios.post('/api/properties', newProp);
      setShowModal(false);
      setNewProp({ name: '', address: '', type: 'Residential' });
      fetchData();
    } catch (e) { alert('Error creating property'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Properties</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Add</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Address</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Type</th></tr></thead>
          <tbody className="divide-y">
            {properties.map(p => <tr key={p.id}><td className="px-6 py-4 font-medium">{p.name}</td><td className="px-6 py-4 text-gray-600">{p.address}</td><td className="px-6 py-4">{p.type}</td></tr>)}
          </tbody>
        </table>
      </div>
      {showModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl w-full max-w-md"><h2 className="text-xl font-bold mb-4">Add Property</h2><input className="w-full border p-2 rounded mb-2" placeholder="Name" value={newProp.name} onChange={e=>setNewProp({...newProp,name:e.target.value})} /><input className="w-full border p-2 rounded mb-2" placeholder="Address" value={newProp.address} onChange={e=>setNewProp({...newProp,address:e.target.value})} /><select className="w-full border p-2 rounded mb-4" value={newProp.type} onChange={e=>setNewProp({...newProp,type:e.target.value})}><option>Residential</option><option>Commercial</option></select><div className="flex justify-end gap-2"><button onClick={()=>setShowModal(false)} className="px-4 py-2 text-gray-600">Cancel</button><button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button></div></div></div>}
    </div>
  );
}