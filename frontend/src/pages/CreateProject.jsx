import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// ── Field-level validation ──────────────────────────────────────────────────
const validate = ({ title, description }) => {
  const errors = {};
  if (!title.trim()) {
    errors.title = 'Project title is required';
  } else if (title.trim().length < 2) {
    errors.title = 'Title must be at least 2 characters';
  } else if (title.trim().length > 100) {
    errors.title = 'Title cannot exceed 100 characters';
  }
  if (description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }
  return errors;
};

// ── CreateProject page ─────────────────────────────────────────────────────
const CreateProject = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axiosInstance.post('/projects', {
        title: form.title.trim(),
        description: form.description.trim(),
      });

      if (res.data.success) {
        navigate('/projects');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const remaining = 500 - form.description.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark px-4"
    >
      <div className="glass-card p-8 w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/projects"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Back to projects"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Project</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set up a collaborative space for your team
            </p>
          </div>
        </div>

        {/* Server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-red-100 text-red-600 p-3 rounded-lg mb-5 text-sm"
            >
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

          {/* Title */}
          <div>
            <label htmlFor="project-title" className="block text-sm font-medium mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="project-title"
              type="text"
              placeholder="e.g. SyncUp Mobile App"
              value={form.title}
              onChange={handleChange('title')}
              disabled={isLoading}
              maxLength={100}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-primary-500 bg-white dark:bg-gray-800 dark:border-gray-700 transition
                disabled:opacity-50 text-gray-900 dark:text-white
                ${fieldErrors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            <AnimatePresence>
              {fieldErrors.title && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {fieldErrors.title}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="project-description" className="text-sm font-medium">
                Description
              </label>
              <span className={`text-xs ${remaining < 50 ? 'text-red-400' : 'text-gray-400'}`}>
                {remaining} / 500
              </span>
            </div>
            <textarea
              id="project-description"
              placeholder="Briefly describe what this project is about…"
              value={form.description}
              onChange={handleChange('description')}
              disabled={isLoading}
              maxLength={500}
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-primary-500 bg-white dark:bg-gray-800 dark:border-gray-700 transition
                disabled:opacity-50 text-gray-900 dark:text-white resize-none
                ${fieldErrors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            <AnimatePresence>
              {fieldErrors.description && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-red-500 text-xs mt-1"
                >
                  {fieldErrors.description}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link
              to="/projects"
              className="flex-1 text-center py-2.5 rounded-lg border border-gray-300
                dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50
                dark:hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Cancel
            </Link>
            <button
              id="submit-project-btn"
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg
                font-medium transition-colors duration-200 disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CreateProject;
