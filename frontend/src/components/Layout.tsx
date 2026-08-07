import { ReactNode, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/properties', label: 'Properties' },
  { path: '/cases', label: 'ASB Cases' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h1 className="text-2xl font-bold text-blue-700 mb-8">POP</h1>
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) =>
              `block px-4 py-2 rounded-lg transition ${isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`
            }>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-gray-500 mb-2">{user?.email}</p>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}