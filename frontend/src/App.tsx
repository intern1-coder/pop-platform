import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';  // ← This was the error
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Cases from './pages/Cases';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import { AuthProvider, AuthContext } from './context/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/properties" element={<ProtectedRoute><Layout><Properties /></Layout></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><Layout><Cases /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;