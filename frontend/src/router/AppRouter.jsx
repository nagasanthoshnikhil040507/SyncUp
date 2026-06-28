import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import CreateProject from '../pages/CreateProject';
import ProjectDetails from '../pages/ProjectDetails';
import Tasks from '../pages/Tasks';
import ProjectFiles from '../pages/ProjectFiles';
import Invitations from '../pages/Invitations';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Chat from '../pages/Chat';
import AiAssistant from '../pages/AiAssistant';
import Admin from '../pages/Admin';
import NotFound from '../pages/NotFound';

// Layout
import AppShell from '../components/AppShell';

// Route guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public Routes (no navbar) ── */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Protected Routes (auth guard → app shell with navbar) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetails />} />
            <Route path="/projects/:projectId/tasks" element={<Tasks />} />
            <Route path="/projects/:projectId/files" element={<ProjectFiles />} />
            <Route path="/invitations" element={<Invitations />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/ai-assistant" element={<AiAssistant />} />
          </Route>
        </Route>

        {/* ── Admin Routes ── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* ── 404 Catch-All ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
