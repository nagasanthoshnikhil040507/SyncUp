import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// ── Empty state ────────────────────────────────────────────────────────────
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="text-6xl mb-4">📂</div>
    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
      No projects yet
    </h2>
    <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
      Create your first project to start collaborating with your team.
    </p>
    <Link
      to="/projects/new"
      className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg
        font-medium transition-colors duration-200"
    >
      + New Project
    </Link>
  </motion.div>
);

// ── Project card ────────────────────────────────────────────────────────────
const ProjectCard = ({ project, currentUserId, onDelete }) => {
  const isOwner = project.owner._id === currentUserId;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/projects/${project._id}`);
      onDelete(project._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="glass-card p-6 flex flex-col gap-3 hover:shadow-xl transition-shadow duration-300"
    >
      {/* Title + owner badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
          {project.title}
        </h3>
        {isOwner && (
          <span className="shrink-0 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700
            dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
            Owner
          </span>
        )}
      </div>

      {/* Description */}
      {project.description ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {project.description}
        </p>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-600 italic">No description</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-1">
        <span>👤 {project.owner.name}</span>
        <span>👥 {project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
        <span className="ml-auto">
          {new Date(project.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/projects/${project._id}`}
          className="flex-1 text-center text-sm py-1.5 rounded-lg border border-primary-400
            text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20
            transition-colors duration-200 font-medium"
        >
          View
        </Link>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm py-1.5 px-4 rounded-lg border border-red-300 text-red-500
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200
              font-medium disabled:opacity-50"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── Projects page ───────────────────────────────────────────────────────────
const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get('/projects');
        if (res.data.success) {
          setProjects(res.data.projects);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleDelete = (deletedId) => {
    setProjects((prev) => prev.filter((p) => p._id !== deletedId));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 dark:bg-dark p-6"
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {isLoading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400
                dark:hover:text-gray-200 transition-colors"
            >
              ← Profile
            </button>
            <Link
              to="/projects/new"
              id="create-project-btn"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg
                font-medium transition-colors duration-200 text-sm"
            >
              + New Project
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && projects.length === 0 && <EmptyState />}

        {/* Project grid */}
        {!isLoading && projects.length > 0 && (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  currentUserId={user?._id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default Projects;
