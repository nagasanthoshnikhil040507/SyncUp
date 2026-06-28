import { Navigate, Outlet } from 'react-router-dom';

/**
 * AdminRoute
 * 
 * Wraps routes that require admin role.
 * If user is not an admin, redirects to /chat.
 * 
 * For now, this checks localStorage for a basic role flag.
 * In Phase 2 (Auth), this will use AuthContext's user.role instead.
 */
const AdminRoute = () => {
  // TODO: Replace with useAuth() hook in Phase 2
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
