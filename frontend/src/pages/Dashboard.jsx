import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

// ── Animation variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, accent }) => (
  <motion.div
    variants={itemVariants}
    className="glass-card p-5 flex items-start gap-4"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${accent}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

// ── Recent project row ────────────────────────────────────────────────────
const ProjectRow = ({ project, index }) => (
  <motion.div
    variants={itemVariants}
    className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0"
  >
    {/* Coloured index badge */}
    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center
      text-white text-xs font-bold shrink-0">
      {index + 1}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
        {project.title}
      </p>
      <p className="text-xs text-gray-400 truncate">
        {project.description || 'No description'} · {project.members.length} member{project.members.length !== 1 ? 's' : ''}
      </p>
    </div>
    <Link
      to={`/projects`}
      className="shrink-0 text-xs text-primary-600 dark:text-primary-400
        hover:underline font-medium"
    >
      View →
    </Link>
  </motion.div>
);

// ── Activity item ─────────────────────────────────────────────────────────
const ActivityItem = ({ icon, text, time }) => (
  <motion.div
    variants={itemVariants}
    className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0"
  >
    <span className="text-base mt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-700 dark:text-gray-200">{text}</p>
      <p className="text-xs text-gray-400">{time}</p>
    </div>
  </motion.div>
);

// ── Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    axiosInstance
      .get('/projects')
      .then((res) => {
        if (res.data.success) setProjects(res.data.projects);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  const recentProjects = projects.slice(0, 5);

  // Placeholder activity feed derived from real projects
  const activities = recentProjects.map((p) => ({
    icon: '📁',
    text: `Project "${p.title}" created`,
    time: new Date(p.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    }),
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8"
    >
      {/* ── Greeting ── */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Good {getGreeting()},{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0] ?? 'there'}</span> 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Here's what's happening in your workspace today.
        </p>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          icon="📂"
          label="Total Projects"
          value={loadingProjects ? '—' : projects.length}
          sub={loadingProjects ? 'Loading…' : `${projects.length} active`}
          accent="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon="✅"
          label="Total Tasks"
          value="—"
          sub="Coming in Phase 3"
          accent="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon="🎯"
          label="Completed Tasks"
          value="—"
          sub="Coming in Phase 3"
          accent="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon="👥"
          label="Team Members"
          value={loadingProjects ? '—' : getUniqueMemberCount(projects)}
          sub="across all projects"
          accent="bg-orange-50 dark:bg-orange-900/20"
        />
      </motion.div>

      {/* ── Two-column content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Projects — 2/3 width */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
            <Link
              to="/projects"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          {loadingProjects ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 items-center py-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">No projects yet</p>
              <Link
                to="/projects/new"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white
                  text-sm px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Create your first project
              </Link>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {recentProjects.map((p, i) => (
                <ProjectRow key={p._id} project={p} index={i} />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Recent Activity — 1/3 width */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>

          {loadingProjects ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 py-2.5">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-sm text-gray-400">No recent activity</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {activities.map((a, i) => (
                <ActivityItem key={i} {...a} />
              ))}
            </motion.div>
          )}

          {/* Placeholder notice */}
          <p className="mt-4 text-xs text-gray-400 italic text-center">
            Task activity coming in Phase 3
          </p>
        </motion.div>
      </div>

      {/* ── Quick actions ── */}
      <motion.div variants={itemVariants} className="mt-6 glass-card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
              text-white rounded-lg text-sm font-medium transition-colors duration-200"
          >
            <span>+</span> New Project
          </Link>
          <Link
            to="/projects"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200
              dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm
              font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
          >
            📂 View Projects
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200
              dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm
              font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
          >
            👤 Edit Profile
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getUniqueMemberCount(projects) {
  const ids = new Set();
  projects.forEach((p) => p.members.forEach((m) => ids.add(m._id)));
  return ids.size;
}

export default Dashboard;
