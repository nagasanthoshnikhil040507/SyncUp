import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ['Todo', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUS_CONFIG = {
  'Todo':        { color: 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300',       dot: 'bg-gray-400',    icon: '⭕' },
  'In Progress': { color: 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300',         dot: 'bg-blue-500',    icon: '🔄' },
  'Completed':   { color: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', icon: '✅' },
};

const PRIORITY_CONFIG = {
  'Low':    { color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',         bar: 'bg-gray-300' },
  'Medium': { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',   bar: 'bg-amber-400' },
  'High':   { color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',           bar: 'bg-red-500' },
};

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'priority', label: 'By priority' },
  { value: 'dueDate',  label: 'By due date' },
];

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

const EMPTY_FORM = {
  title: '', description: '', status: 'Todo',
  priority: 'Medium', dueDate: '', assignedTo: '',
};

// ── Animation variants ────────────────────────────────────────────────────────
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit:   { opacity: 0, x: -10, transition: { duration: 0.2 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (iso, status) =>
  iso &&
  status !== 'Completed' &&
  new Date(iso) < new Date() &&
  new Date(iso).toDateString() !== new Date().toDateString();

const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

const avatarColors = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500',
];
const getAvatarColor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
    <div className="glass-card p-4 space-y-3">
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
  </div>
);

// ── Error state ───────────────────────────────────────────────────────────────
const ErrorState = ({ type, onBack }) => {
  const MAP = {
    notFound:  { icon: '🔍', title: 'Project Not Found',    msg: 'This project does not exist or was deleted.' },
    forbidden: { icon: '🔒', title: 'Access Denied',        msg: 'You are not a member of this project.' },
    generic:   { icon: '⚠️', title: 'Something Went Wrong', msg: 'An unexpected error occurred.' },
  };
  const { icon, title, msg } = MAP[type] ?? MAP.generic;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div className="glass-card p-12 flex flex-col items-center text-center gap-4">
        <span className="text-6xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">{msg}</p>
        <button onClick={onBack}
          className="mt-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
          ← Back to Project
        </button>
      </div>
    </motion.div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, count, icon, accent }) => (
  <motion.div variants={rowVariants}
    className="glass-card p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{count}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
    </div>
  </motion.div>
);

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Todo'];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
};

// ── Priority pill ─────────────────────────────────────────────────────────────
const PriorityPill = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Medium'];
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>
      {priority}
    </span>
  );
};

// ── Assignee avatar + name ────────────────────────────────────────────────────
const Assignee = ({ member }) => {
  if (!member) return <span className="text-xs text-gray-400 italic">Unassigned</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white
        text-[10px] font-bold shrink-0 ${getAvatarColor(member._id)}`}>
        {getInitial(member.name)}
      </div>
      <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[80px]">
        {member.name}
      </span>
    </div>
  );
};

// ── Task row (list view) ──────────────────────────────────────────────────────
const TaskRow = ({ task, onEdit, onDelete, onStatusChange }) => {
  const due = formatDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <motion.tr
      layout
      variants={rowVariants}
      exit="exit"
      className="group border-b border-gray-100 dark:border-white/5 last:border-0
        hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors duration-150"
    >
      {/* Status — clickable pill cycles through statuses */}
      <td className="px-4 py-3 w-36">
        <button
          id={`status-task-${task._id}`}
          onClick={() => onStatusChange(task)}
          className="cursor-pointer hover:scale-105 transition-transform duration-150"
          title="Click to change status"
        >
          <StatusPill status={task.status} />
        </button>
      </td>

      {/* Title + description */}
      <td className="px-4 py-3 min-w-0">
        <p className={`text-sm font-semibold leading-snug
          ${task.status === 'Completed'
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-900 dark:text-white'
          }`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}
      </td>

      {/* Priority */}
      <td className="px-4 py-3 w-24 hidden sm:table-cell">
        <PriorityPill priority={task.priority} />
      </td>

      {/* Assigned to */}
      <td className="px-4 py-3 w-36 hidden md:table-cell">
        <Assignee member={task.assignedTo} />
      </td>

      {/* Due date */}
      <td className="px-4 py-3 w-32 hidden lg:table-cell">
        {due ? (
          <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {overdue && '⚠ '}{due}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Created by */}
      <td className="px-4 py-3 w-32 hidden xl:table-cell">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {task.createdBy?.name || '—'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 w-20">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            id={`edit-task-${task._id}`}
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50
              dark:hover:bg-primary-900/20 transition-colors duration-150"
            title="Edit task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
          <button
            id={`delete-task-${task._id}`}
            onClick={() => onDelete(task)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50
              dark:hover:bg-red-900/20 transition-colors duration-150"
            title="Delete task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// ── Task Modal (Create / Edit) ────────────────────────────────────────────────
const TaskModal = ({ isOpen, editingTask, members, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (editingTask) {
      setForm({
        title:       editingTask.title || '',
        description: editingTask.description || '',
        status:      editingTask.status || 'Todo',
        priority:    editingTask.priority || 'Medium',
        dueDate:     editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : '',
        assignedTo:  editingTask.assignedTo?._id || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError('');
  }, [editingTask, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length < 2) e.title = 'Title must be at least 2 characters';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        title:       form.title.trim(),
        description: form.description.trim(),
        dueDate:     form.dueDate || null,
        assignedTo:  form.assignedTo || null,
      });
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const fieldCls = (field) =>
    `w-full px-3 py-2.5 text-sm rounded-lg border transition-colors duration-200
    bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:border-gray-700
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:opacity-60 disabled:cursor-not-allowed
    ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                  hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Server error */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                    text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                  {serverError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="task-title" type="text" placeholder="What needs to be done?"
                  value={form.title} onChange={handleChange('title')}
                  maxLength={150} disabled={saving} className={fieldCls('title')}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  id="task-description" placeholder="Optional details…"
                  value={form.description} onChange={handleChange('description')}
                  maxLength={1000} rows={3} disabled={saving}
                  className={`${fieldCls('description')} resize-none`}
                />
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                  <select id="task-status" value={form.status} onChange={handleChange('status')}
                    disabled={saving} className={fieldCls('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                  <select id="task-priority" value={form.priority} onChange={handleChange('priority')}
                    disabled={saving} className={fieldCls('priority')}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Due Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input id="task-due-date" type="date"
                  value={form.dueDate} onChange={handleChange('dueDate')}
                  disabled={saving} className={fieldCls('dueDate')} />
              </div>

              {/* Assign member */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Assign To
                </label>
                <select id="task-assigned-to" value={form.assignedTo} onChange={handleChange('assignedTo')}
                  disabled={saving} className={fieldCls('assignedTo')}>
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                    text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                    transition-colors text-sm font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button id="save-task-btn" type="submit" disabled={saving}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5
                    rounded-lg font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteModal = ({ task, onConfirm, onCancel, deleting }) => (
  <AnimatePresence>
    {task && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
          className="glass-card p-6 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Task?</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">"{task.title}"</span>?
            {' '}This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={deleting}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors text-sm font-medium disabled:opacity-50">
              Cancel
            </button>
            <button id="confirm-delete-task-btn" onClick={onConfirm} disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg
                font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {deleting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Status cycle modal (quick status change) ──────────────────────────────────
const StatusModal = ({ task, onSelect, onCancel }) => (
  <AnimatePresence>
    {task && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.15 }}
          className="glass-card p-4 w-full max-w-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Change status for:
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">"{task.title}"</p>
          <div className="flex flex-col gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => onSelect(task._id, s)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left
                  text-sm font-medium transition-colors duration-150
                  ${task.status === s
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[s].dot}`} />
                <span className="text-gray-800 dark:text-gray-200">{s}</span>
                {task.status === s && (
                  <span className="ml-auto text-primary-500 text-xs">current</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={onCancel}
            className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600
              dark:hover:text-gray-300 transition-colors">
            Cancel
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Filter / Search bar ───────────────────────────────────────────────────────
const FilterBar = ({ search, setSearch, filterStatus, setFilterStatus,
  filterPriority, setFilterPriority, filterMember, setFilterMember,
  sortBy, setSortBy, members }) => (
  <div className="flex flex-wrap gap-2 items-center">
    {/* Search */}
    <div className="relative flex-1 min-w-[180px]">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        id="task-search"
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-colors duration-200"
      />
    </div>

    {/* Status filter */}
    <select
      id="filter-status"
      value={filterStatus}
      onChange={e => setFilterStatus(e.target.value)}
      className="py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
        focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
      <option value="">All Statuses</option>
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>

    {/* Priority filter */}
    <select
      id="filter-priority"
      value={filterPriority}
      onChange={e => setFilterPriority(e.target.value)}
      className="py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
        focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
      <option value="">All Priorities</option>
      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
    </select>

    {/* Member filter */}
    <select
      id="filter-member"
      value={filterMember}
      onChange={e => setFilterMember(e.target.value)}
      className="py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
        focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
      <option value="">All Members</option>
      <option value="unassigned">Unassigned</option>
      {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
    </select>

    {/* Sort */}
    <select
      id="sort-tasks"
      value={sortBy}
      onChange={e => setSortBy(e.target.value)}
      className="py-2 pl-3 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
        focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors">
      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Tasks Page ────────────────────────────────────────────────────────────────
const Tasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject]     = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [statusTask, setStatusTask]     = useState(null); // task pending status change

  // Filter / sort state
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterMember, setFilterMember]   = useState('');
  const [sortBy, setSortBy]           = useState('newest');

  // ── Fetch project + tasks ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        axiosInstance.get(`/projects/${projectId}`),
        axiosInstance.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data.project);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) setErrorType('notFound');
      else if (status === 403) setErrorType('forbidden');
      else setErrorType('generic');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todo       = tasks.filter(t => t.status === 'Todo').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completed  = tasks.filter(t => t.status === 'Completed').length;
    const overdue    = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    return { todo, inProgress, completed, overdue };
  }, [tasks]);

  // ── Filtered + sorted tasks ───────────────────────────────────────────────
  const visibleTasks = useMemo(() => {
    let list = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q));
    }
    if (filterStatus)   list = list.filter(t => t.status === filterStatus);
    if (filterPriority) list = list.filter(t => t.priority === filterPriority);
    if (filterMember) {
      if (filterMember === 'unassigned') list = list.filter(t => !t.assignedTo);
      else list = list.filter(t => t.assignedTo?._id === filterMember);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'oldest')   return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

    return list;
  }, [tasks, search, filterStatus, filterPriority, filterMember, sortBy]);

  // ── Create / Edit ─────────────────────────────────────────────────────────
  const handleSave = async (formData) => {
    if (editingTask) {
      const res = await axiosInstance.put(`/tasks/${editingTask._id}`, formData);
      setTasks(prev => prev.map(t => t._id === editingTask._id ? res.data.task : t));
    } else {
      const res = await axiosInstance.post(`/projects/${projectId}/tasks`, formData);
      setTasks(prev => [res.data.task, ...prev]);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await axiosInstance.delete(`/tasks/${taskToDelete._id}`);
      setTasks(prev => prev.filter(t => t._id !== taskToDelete._id));
      setTaskToDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete task');
      setTaskToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Quick status change ───────────────────────────────────────────────────
  const handleStatusSelect = async (taskId, newStatus) => {
    setStatusTask(null);
    if (newStatus === statusTask?.status) return; // no change
    try {
      const res = await axiosInstance.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
    } catch {
      // silently ignore — task stays unchanged
    }
  };

  const openCreate = () => { setEditingTask(null); setModalOpen(true); };
  const openEdit   = (task) => { setEditingTask(task); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingTask(null); };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;
  if (errorType) return (
    <ErrorState type={errorType} onBack={() => navigate(`/projects/${projectId}`)} />
  );

  const members = project?.members || [];
  const hasFilters = search || filterStatus || filterPriority || filterMember;

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6"
      >
        {/* ── Back ── */}
        <motion.div variants={rowVariants}>
          <button
            id="back-to-project-btn"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400
              hover:text-gray-800 dark:hover:text-gray-100 transition-colors font-medium"
          >
            ← Back to Project
          </button>
        </motion.div>

        {/* ── Header ── */}
        <motion.div variants={rowVariants} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {project.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Task Manager · {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            id="create-task-btn"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700
              text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </motion.div>

        {/* ── Stat cards ── */}
        <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="To Do"       count={stats.todo}       icon="⭕" accent="bg-gray-100 dark:bg-gray-700" />
          <StatCard label="In Progress" count={stats.inProgress} icon="🔄" accent="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard label="Completed"   count={stats.completed}  icon="✅" accent="bg-emerald-50 dark:bg-emerald-900/20" />
          <StatCard label="Overdue"     count={stats.overdue}    icon="⚠️" accent="bg-red-50 dark:bg-red-900/20" />
        </motion.div>

        {/* ── Delete error toast ── */}
        <AnimatePresence>
          {deleteError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            >
              <span>⚠ {deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="ml-4 hover:opacity-70">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filter bar ── */}
        <motion.div variants={rowVariants}>
          <FilterBar
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterPriority={filterPriority} setFilterPriority={setFilterPriority}
            filterMember={filterMember} setFilterMember={setFilterMember}
            sortBy={sortBy} setSortBy={setSortBy}
            members={members}
          />
        </motion.div>

        {/* ── Task list ── */}
        <motion.div variants={rowVariants} className="glass-card overflow-hidden">
          {tasks.length === 0 ? (
            /* ── First-run empty state ── */
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 px-4">
              <span className="text-6xl">📋</span>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                No tasks yet
              </h2>
              <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs">
                Create your first task to start tracking work for this project.
              </p>
              <button onClick={openCreate}
                className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5
                  rounded-lg font-medium transition-colors text-sm">
                + Create First Task
              </button>
            </div>
          ) : visibleTasks.length === 0 ? (
            /* ── Filter empty state ── */
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-4">
              <span className="text-5xl">🔍</span>
              <p className="text-gray-600 dark:text-gray-300 font-medium">No tasks match your filters</p>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('');
                  setFilterPriority('');
                  setFilterMember('');
                }}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* ── Task table ── */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 hidden sm:table-cell">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36 hidden md:table-cell">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 hidden lg:table-cell">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 hidden xl:table-cell">
                      Created By
                    </th>
                    <th className="px-4 py-3 w-20">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                  <AnimatePresence mode="popLayout">
                    {visibleTasks.map(task => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        onEdit={openEdit}
                        onDelete={setTaskToDelete}
                        onStatusChange={setStatusTask}
                      />
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>
              {/* Row count */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5
                text-xs text-gray-400 dark:text-gray-500">
                {hasFilters
                  ? `Showing ${visibleTasks.length} of ${tasks.length} tasks`
                  : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`
                }
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Modals ── */}
      <TaskModal
        isOpen={modalOpen}
        editingTask={editingTask}
        members={members}
        onClose={closeModal}
        onSave={handleSave}
      />

      <DeleteModal
        task={taskToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
        deleting={deleting}
      />

      <StatusModal
        task={statusTask}
        onSelect={handleStatusSelect}
        onCancel={() => setStatusTask(null)}
      />
    </>
  );
};

export default Tasks;
