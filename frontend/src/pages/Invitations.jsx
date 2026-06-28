import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyInvitations, acceptInvitation, rejectInvitation } from '../api/invitationApi';

// ── Animation variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const avatarColors = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
];

const getAvatarColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

// ── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="glass-card p-5 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
      </div>
    </div>
    <div className="flex gap-2 pt-1">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
    </div>
  </div>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    Accepted: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
    Pending:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  const icons = { Accepted: '✓', Rejected: '✕', Pending: '⏳' };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${styles[status]}`}>
      <span>{icons[status]}</span>
      {status}
    </span>
  );
};

// ── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
    <span className="text-5xl">{icon}</span>
    <p className="text-gray-700 dark:text-gray-300 font-medium">{title}</p>
    <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs">{subtitle}</p>
  </div>
);

// ── Pending Invitation Card ───────────────────────────────────────────────────
const PendingCard = ({ invitation, onAccept, onReject, isActing }) => {
  const { project, sender, createdAt } = invitation;

  return (
    <motion.div
      layout
      variants={itemVariants}
      exit="exit"
      className="glass-card p-5"
    >
      {/* Project info */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center
            text-white font-bold text-sm shrink-0 ${getAvatarColor(project?._id || '')}`}
        >
          {getInitial(project?.title)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {project?.title || 'Unknown Project'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Invited by{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {sender?.name || 'Unknown'}
            </span>
            {' · '}
            {formatDate(createdAt)}
          </p>
        </div>
        <StatusBadge status="Pending" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          id={`accept-invite-${invitation._id}`}
          onClick={() => onAccept(invitation._id)}
          disabled={isActing}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
            bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed
            text-white text-sm font-semibold transition-colors duration-200"
        >
          {isActing === `accept-${invitation._id}` ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            '✓'
          )}
          Accept
        </button>
        <button
          id={`reject-invite-${invitation._id}`}
          onClick={() => onReject(invitation._id)}
          disabled={isActing}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
            border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5
            hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800
            disabled:opacity-60 disabled:cursor-not-allowed
            text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400
            text-sm font-semibold transition-colors duration-200"
        >
          {isActing === `reject-${invitation._id}` ? (
            <span className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-500 rounded-full animate-spin" />
          ) : (
            '✕'
          )}
          Reject
        </button>
      </div>
    </motion.div>
  );
};

// ── History Card ─────────────────────────────────────────────────────────────
const HistoryCard = ({ invitation }) => {
  const { project, sender, status, createdAt } = invitation;

  return (
    <motion.div variants={itemVariants} className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center
            text-white font-bold text-sm shrink-0 opacity-80 ${getAvatarColor(project?._id || '')}`}
        >
          {getInitial(project?.title)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
            {project?.title || 'Unknown Project'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            From {sender?.name || 'Unknown'} · {formatDate(createdAt)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
    </motion.div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const Invitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(null); // tracks which button is loading
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getMyInvitations();
      if (res.data.success) {
        setInvitations(res.data.invitations);
      }
    } catch (err) {
      setError('Failed to load invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (invitationId) => {
    setIsActing(`accept-${invitationId}`);
    try {
      await acceptInvitation(invitationId);
      setInvitations((prev) =>
        prev.map((inv) =>
          inv._id === invitationId ? { ...inv, status: 'Accepted' } : inv
        )
      );
      showToast('success', 'Invitation accepted! You are now a project member.');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setIsActing(null);
    }
  };

  const handleReject = async (invitationId) => {
    setIsActing(`reject-${invitationId}`);
    try {
      await rejectInvitation(invitationId);
      setInvitations((prev) =>
        prev.map((inv) =>
          inv._id === invitationId ? { ...inv, status: 'Rejected' } : inv
        )
      );
      showToast('success', 'Invitation rejected.');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to reject invitation');
    } finally {
      setIsActing(null);
    }
  };

  const pending = invitations.filter((inv) => inv.status === 'Pending');
  const history = invitations.filter((inv) => inv.status !== 'Pending');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ── Toast notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg
              text-sm font-medium flex items-center gap-2
              ${toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
              }`}
          >
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Invitations
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage your project invitations
        </p>
      </motion.div>

      {/* ── Error state ── */}
      {error && !isLoading && (
        <div className="glass-card p-5 border border-red-200 dark:border-red-900/50">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchInvitations}
            className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Pending Invitations ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Pending Invitations
          </h2>
          {!isLoading && pending.length > 0 && (
            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700
              dark:text-primary-300 px-2 py-0.5 rounded-full font-semibold">
              {pending.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : pending.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon="📭"
              title="No pending invitations"
              subtitle="When someone invites you to a project, it will appear here."
            />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {pending.map((inv) => (
                <PendingCard
                  key={inv._id}
                  invitation={inv}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  isActing={isActing}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── Invitation History ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Invitation History
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon="🗂️"
              title="No history yet"
              subtitle="Accepted and rejected invitations will appear here."
            />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {history.map((inv) => (
              <HistoryCard key={inv._id} invitation={inv} />
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Invitations;
