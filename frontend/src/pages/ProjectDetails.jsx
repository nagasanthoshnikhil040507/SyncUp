import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { inviteToProject, removeMember } from '../api/invitationApi';

// ── Animation variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

const avatarColors = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-rose-500',
];

const getAvatarColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    {/* Header skeleton */}
    <div className="glass-card p-6 space-y-3">
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-4/5" />
      <div className="flex gap-6 pt-2">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-24" />
      </div>
    </div>
    {/* Section skeleton */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-6 space-y-3">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    ))}
  </div>
);

// ── Error state ───────────────────────────────────────────────────────────────
const ErrorState = ({ type, onBack }) => {
  const config = {
    notFound: {
      icon: '🔍',
      title: 'Project Not Found',
      message: 'This project does not exist or has been deleted.',
    },
    forbidden: {
      icon: '🔒',
      title: 'Access Denied',
      message: 'You are not a member of this project.',
    },
    generic: {
      icon: '⚠️',
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
    },
  };

  const { icon, title, message } = config[type] ?? config.generic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      <div className="glass-card p-12 flex flex-col items-center text-center gap-4">
        <span className="text-6xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
        <button
          onClick={onBack}
          className="mt-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5
            rounded-lg font-medium transition-colors duration-200 text-sm"
        >
          ← Back to Projects
        </button>
      </div>
    </motion.div>
  );
};

// ── Invite Modal ──────────────────────────────────────────────────────────────
const InviteModal = ({ projectId, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await inviteToProject(projectId, email.trim());
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail('');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="glass-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Invite Member</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Enter the email address of a registered SyncUp user.
        </p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              id="invite-email-input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setSuccess(null); }}
              placeholder="teammate@example.com"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm
                bg-white dark:bg-dark-200 border border-gray-200 dark:border-white/10
                text-gray-900 dark:text-white placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                transition-colors duration-200"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5">
              <span>⚠</span> {error}
            </p>
          )}

          {/* Success message */}
          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> {success}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              id="send-invite-btn"
              disabled={isLoading || !email.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed
                text-white text-sm font-semibold rounded-xl transition-colors duration-200"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : '✉'}
              {isLoading ? 'Sending…' : 'Send Invite'}
            </button>
            <button
              type="button"
              id="cancel-invite-btn"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200
                hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Member row ─────────────────────────────────────────────────────────────────
const MemberAvatar = ({ member, isOwner, canRemove, onRemove, isRemoving }) => (
  <motion.div
    layout
    variants={itemVariants}
    className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-0"
  >
    {/* Avatar */}
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white
        font-semibold text-sm shrink-0 ${getAvatarColor(member._id)}`}
    >
      {getInitial(member.name)}
    </div>

    {/* Name + email */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {member.name}
      </p>
      <p className="text-xs text-gray-400 truncate">{member.email}</p>
    </div>

    {/* Role badge + remove button */}
    <div className="flex items-center gap-2 shrink-0">
      {isOwner ? (
        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700
          dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
          Owner
        </span>
      ) : (
        <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500
          dark:text-gray-400 px-2 py-0.5 rounded-full">
          Member
        </span>
      )}
      {canRemove && (
        <button
          id={`remove-member-${member._id}`}
          onClick={() => onRemove(member._id)}
          disabled={isRemoving === member._id}
          title={`Remove ${member.name}`}
          className="ml-1 flex items-center justify-center w-7 h-7 rounded-lg
            text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {isRemoving === member._id ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-300/30 border-t-gray-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  </motion.div>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ icon, title, children, badge }) => (
  <motion.div variants={itemVariants} className="glass-card p-6">
    <div className="flex items-center gap-2 mb-5">
      <span className="text-lg">{icon}</span>
      <h2 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h2>
      {badge != null && (
        <span className="ml-auto text-xs bg-gray-100 dark:bg-white/10 text-gray-500
          dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      )}
    </div>
    {children}
  </motion.div>
);

// ── Meta chip ─────────────────────────────────────────────────────────────────
const MetaChip = ({ icon, label, value }) => (
  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
    <span>{icon}</span>
    <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
    <span>{value}</span>
  </div>
);

// ── ProjectDetails page ───────────────────────────────────────────────────────
const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [memberError, setMemberError] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axiosInstance.get(`/projects/${projectId}`);
        if (res.data.success) {
          setProject(res.data.project);
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 404) setErrorType('notFound');
        else if (status === 403) setErrorType('forbidden');
        else setErrorType('generic');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleRemoveMember = async (memberId) => {
    setRemovingMemberId(memberId);
    setMemberError(null);
    try {
      await removeMember(projectId, memberId);
      setProject((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m._id !== memberId),
      }));
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleBack = () => navigate('/projects');

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;

  // ── Error ────────────────────────────────────────────────────────────────
  if (errorType) return <ErrorState type={errorType} onBack={handleBack} />;

  // ── Data ─────────────────────────────────────────────────────────────────
  const isOwner = project.owner._id === user?._id;
  const ownerMemberId = project.owner._id;

  // Sort: owner first, then rest alphabetically
  const sortedMembers = [...project.members].sort((a, b) => {
    if (a._id === ownerMemberId) return -1;
    if (b._id === ownerMemberId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6"
    >
      {/* ── Back navigation ── */}
      <motion.div variants={itemVariants}>
        <button
          id="back-to-projects-btn"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400
            hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
        >
          ← Back to Projects
        </button>
      </motion.div>

      {/* ── Header card ── */}
      <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8">
        {/* Title + owner badge */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {project.title}
          </h1>
          {isOwner && (
            <span className="shrink-0 mt-1 text-xs bg-primary-100 dark:bg-primary-900/30
              text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-full font-semibold">
              Your Project
            </span>
          )}
        </div>

        {/* Description */}
        {project.description ? (
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">
            {project.description}
          </p>
        ) : (
          <p className="text-gray-400 dark:text-gray-600 text-sm italic mb-5">
            No description provided.
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 border-t border-gray-100 dark:border-white/5">
          <MetaChip icon="👤" label="Owner" value={project.owner.name} />
          <MetaChip icon="👥" label="Members" value={`${project.members.length} member${project.members.length !== 1 ? 's' : ''}`} />
          <MetaChip icon="📅" label="Created" value={formatDate(project.createdAt)} />
          <MetaChip icon="🔄" label="Updated" value={formatDate(project.updatedAt)} />
        </div>
      </motion.div>

      {/* ── Members section ── */}
      <Section icon="👥" title="Members" badge={project.members.length}>

        {/* Owner action: Invite button */}
        {isOwner && (
          <div className="mb-4">
            <button
              id="invite-member-btn"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                bg-primary-600 hover:bg-primary-700 text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Invite Member
            </button>
          </div>
        )}

        {/* Member error */}
        {memberError && (
          <p className="text-sm text-red-500 mb-3 flex items-center gap-1">
            <span>⚠</span> {memberError}
          </p>
        )}

        <AnimatePresence mode="popLayout">
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            {sortedMembers.map((member) => (
              <MemberAvatar
                key={member._id}
                member={member}
                isOwner={member._id === ownerMemberId}
                canRemove={isOwner && member._id !== ownerMemberId}
                onRemove={handleRemoveMember}
                isRemoving={removingMemberId}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </Section>

      {/* ── Tasks section ── */}
      <Section icon="✅" title="Tasks">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <span className="text-5xl">📋</span>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage all tasks for this project.
          </p>
          <Link
            id="open-tasks-btn"
            to={`/projects/${projectId}/tasks`}
            className="mt-1 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700
              text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            Open Tasks →
          </Link>
        </div>
      </Section>

      {/* ── Documents section ── */}
      <Section icon="📁" title="Documents">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <span className="text-5xl">📂</span>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Upload and share files with your project team.
          </p>
          <Link
            id="open-documents-btn"
            to={`/projects/${projectId}/files`}
            className="mt-1 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700
              text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            Open Documents →
          </Link>
        </div>
      </Section>

      {/* ── Chat section ── */}
      <Section icon="💬" title="Chat">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <span className="text-5xl">💬</span>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Real-time messaging with your project team.
          </p>
          <Link
            id="open-chat-btn"
            to={`/projects/${projectId}/chat`}
            className="mt-1 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700
              text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            Open Chat →
          </Link>
        </div>
      </Section>

      {/* ── Activity section (placeholder) ── */}
      <Section icon="🔔" title="Activity">
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <span className="text-5xl">📊</span>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Activity timeline will be implemented in the next phase.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Track commits, task changes, member updates, and more — all in one place.
          </p>
        </div>
      </Section>
    </motion.div>

    {/* ── Invite Modal (portal-style overlay) ── */}
    <AnimatePresence>
      {showInviteModal && (
        <InviteModal
          projectId={projectId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            // Optionally close modal on success after a brief delay
            setTimeout(() => setShowInviteModal(false), 2000);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
};

export default ProjectDetails;

