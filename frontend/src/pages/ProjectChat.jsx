import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { getMessages } from '../api/chatApi';
import { getSocket } from '../socket/socketClient';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const formatDateGroup = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

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

// Group messages by date so we can render "Today", "Yesterday", etc.
const groupByDate = (messages) => {
  const groups = [];
  let lastDateStr = null;
  for (const msg of messages) {
    const dateStr = formatDateGroup(msg.createdAt);
    if (dateStr !== lastDateStr) {
      groups.push({ type: 'date-divider', label: dateStr, id: `date-${msg.createdAt}` });
      lastDateStr = dateStr;
    }
    groups.push({ type: 'message', ...msg });
  }
  return groups;
};

// ── Animation variants ────────────────────────────────────────────────────────
const msgVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit:   { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const ChatSkeleton = () => (
  <div className="flex flex-col h-full">
    {/* Header skeleton */}
    <div className="border-b border-gray-100 dark:border-white/10 p-4 flex items-center gap-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-5 w-24 ml-auto" />
    </div>
    {/* Messages skeleton */}
    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className={`h-3 w-16 ${i % 2 === 0 ? 'ml-auto' : ''}`} />
            <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
          </div>
        </div>
      ))}
    </div>
    {/* Input skeleton */}
    <div className="border-t border-gray-100 dark:border-white/10 p-4">
      <Skeleton className="h-11 w-full rounded-xl" />
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
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="glass-card p-10 flex flex-col items-center text-center gap-4 max-w-sm">
        <span className="text-6xl">{icon}</span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{msg}</p>
        <button onClick={onBack}
          className="mt-1 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5
            rounded-lg font-medium transition-colors text-sm">
          ← Back to Project
        </button>
      </div>
    </div>
  );
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white
      font-bold shrink-0 ${getAvatarColor(name)}`}>
      {getInitial(name)}
    </div>
  );
};

// ── Online member pill ────────────────────────────────────────────────────────
const OnlinePill = ({ member }) => (
  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20
    border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1">
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
      {member.name}
    </span>
  </div>
);

// ── Connection status badge ───────────────────────────────────────────────────
const ConnStatus = ({ status }) => {
  const CONFIG = {
    connected:    { dot: 'bg-emerald-500', label: 'Connected',    text: 'text-emerald-600 dark:text-emerald-400' },
    connecting:   { dot: 'bg-amber-400 animate-pulse', label: 'Connecting…', text: 'text-amber-600 dark:text-amber-400' },
    disconnected: { dot: 'bg-red-500 animate-pulse', label: 'Disconnected', text: 'text-red-600 dark:text-red-400' },
  };
  const cfg = CONFIG[status] || CONFIG.disconnected;
  return (
    <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
};

// ── Date divider ──────────────────────────────────────────────────────────────
const DateDivider = ({ label }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium px-2 shrink-0">
      {label}
    </span>
    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isOwn, onDelete }) => {
  const [showDelete, setShowDelete] = useState(false);
  const senderName = msg.sender?.name || 'Unknown';

  return (
    <motion.div
      layout
      variants={msgVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => isOwn && setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Avatar — always show for others; own messages have no avatar (cleaner look) */}
      {!isOwn ? (
        <Avatar name={senderName} />
      ) : (
        // Spacer so own messages don't collapse flush-right without visual rhythm
        <div className="w-8 shrink-0" />
      )}

      <div className={`flex flex-col gap-0.5 max-w-[72%] sm:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name — others only */}
        {!isOwn && (
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-1 leading-none mb-0.5">
            {senderName}
          </span>
        )}

        {/* Bubble + delete button row */}
        <div className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Message text */}
          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
            break-words whitespace-pre-wrap overflow-wrap-anywhere max-w-full
            ${isOwn
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white rounded-bl-sm'
            }`}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            {msg.message}
            {msg.edited && (
              <span className="ml-1.5 text-[10px] opacity-60 italic">(edited)</span>
            )}
          </div>

          {/* Delete button — own messages only, on hover */}
          <AnimatePresence>
            {showDelete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
                id={`delete-msg-${msg._id}`}
                onClick={() => onDelete(msg)}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500
                  hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 mb-0.5"
                title="Delete message"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] text-gray-400 dark:text-gray-500 px-1 mt-0.5
          ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </motion.div>
  );
};

// ── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteModal = ({ msg, onConfirm, onCancel, deleting }) => (
  <AnimatePresence>
    {msg && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
          className="glass-card p-6 w-full max-w-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Message?</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            This message will be removed for everyone. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={deleting}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors text-sm font-medium disabled:opacity-50">
              Cancel
            </button>
            <button id="confirm-delete-msg-btn" onClick={onConfirm} disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg
                font-medium transition-colors text-sm disabled:opacity-50
                flex items-center justify-center gap-2">
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

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg
          text-sm font-medium flex items-center gap-2 whitespace-nowrap
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
      >
        <span>{toast.type === 'success' ? '✓' : '✕'}</span>
        {toast.message}
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ typers }) => {
  if (typers.length === 0) return null;
  const label =
    typers.length === 1
      ? `${typers[0].userName} is typing…`
      : `${typers.map(t => t.userName).join(', ')} are typing…`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 px-4 pb-1 text-xs text-gray-400 dark:text-gray-500 italic"
    >
      <div className="flex gap-0.5">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
        ))}
      </div>
      {label}
    </motion.div>
  );
};

// ── ProjectChat Page ──────────────────────────────────────────────────────────
const ProjectChat = () => {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [project, setProject]     = useState(null);
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting'); // connected | disconnected | connecting

  // Online members from socket room
  const [onlineMembers, setOnlineMembers] = useState([]);

  // Typers
  const [typers, setTypers] = useState([]); // [{ userId, userName }]
  const typingTimers = useRef({}); // userId → clearTimeout handle

  // Message input
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const isTypingRef = useRef(false);

  // Delete modal
  const [msgToDelete, setMsgToDelete] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Scroll
  const messagesEndRef = useRef(null);
  const scrollToBottom = useCallback((behaviour = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior: behaviour });
  }, []);

  // ── Load project info + message history ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, msgRes] = await Promise.all([
          axiosInstance.get(`/projects/${projectId}`),
          getMessages(projectId),
        ]);
        setProject(projRes.data.project);
        setMessages(msgRes.data.messages);
      } catch (err) {
        const status = err.response?.status;
        if (status === 404) setErrorType('notFound');
        else if (status === 403) setErrorType('forbidden');
        else setErrorType('generic');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [projectId]);

  // Scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      scrollToBottom('instant');
    }
  }, [isLoading]); // only on initial load

  // Scroll to bottom when a new message arrives
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  // ── Socket.IO setup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || errorType) return; // don't connect until data is loaded

    const socket = getSocket();

    // Connection state
    const onConnect    = () => { setConnStatus('connected');    console.log('[Socket] connected'); };
    const onDisconnect = () => { setConnStatus('disconnected'); console.log('[Socket] disconnected'); };
    const onConnError  = () => setConnStatus('disconnected');

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnError);

    if (socket.connected) setConnStatus('connected');

    // Join the project room
    socket.emit('join-project', { projectId });

    // ── Incoming events ─────────────────────────────────────────────────────
    const onReceiveMessage = ({ message }) => {
      setMessages(prev => [...prev, message]);
    };

    const onDeleteMessage = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const onOnlineMembers = ({ members }) => {
      setOnlineMembers(members);
    };

    const onTypingStart = ({ userId, userName }) => {
      setTypers(prev => {
        if (prev.find(t => t.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
      // Auto-clear after 4 s if no typing-stop received
      clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypers(prev => prev.filter(t => t.userId !== userId));
      }, 4000);
    };

    const onTypingStop = ({ userId }) => {
      clearTimeout(typingTimers.current[userId]);
      setTypers(prev => prev.filter(t => t.userId !== userId));
    };

    const onSocketError = ({ message }) => {
      showToast('error', message);
    };

    socket.on('receive-message',  onReceiveMessage);
    socket.on('delete-message',   onDeleteMessage);
    socket.on('online-members',   onOnlineMembers);
    socket.on('typing-start',     onTypingStart);
    socket.on('typing-stop',      onTypingStop);
    socket.on('error',            onSocketError);

    return () => {
      // Leave the room when navigating away
      socket.emit('leave-project', { projectId });

      socket.off('connect',         onConnect);
      socket.off('disconnect',      onDisconnect);
      socket.off('connect_error',   onConnError);
      socket.off('receive-message', onReceiveMessage);
      socket.off('delete-message',  onDeleteMessage);
      socket.off('online-members',  onOnlineMembers);
      socket.off('typing-start',    onTypingStart);
      socket.off('typing-stop',     onTypingStop);
      socket.off('error',           onSocketError);

      // Clear all typing timers
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [projectId, isLoading, errorType, showToast]);

  // ── Typing indicators ─────────────────────────────────────────────────────
  const typingStopTimer = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing-start', { projectId });
    }

    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing-stop', { projectId });
    }, 1500);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;

    // Stop typing indicator
    clearTimeout(typingStopTimer.current);
    isTypingRef.current = false;
    getSocket().emit('typing-stop', { projectId });

    setSending(true);
    getSocket().emit('send-message', { projectId, message: text });
    setInput('');
    setSending(false);
  }, [input, sending, projectId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      // Use socket for real-time deletion broadcast
      getSocket().emit('delete-message', {
        messageId: msgToDelete._id,
        projectId,
      });
      setMsgToDelete(null);
    } catch {
      showToast('error', 'Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  const grouped = groupByDate(messages);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 h-[calc(100vh-4rem)] flex flex-col">
        <ChatSkeleton />
      </div>
    );
  }

  if (errorType) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
        <ErrorState type={errorType} onBack={() => navigate(`/projects/${projectId}`)} />
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} />

      {/* Full-height chat container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col"
        style={{ height: 'calc(100vh - 4rem)' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap shrink-0 mb-3 mt-3"
        >
          {/* Back button */}
          <button
            id="back-to-project-btn"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
              transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Project name + chat label */}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {project?.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Project Chat</p>
          </div>

          {/* Connection status */}
          <ConnStatus status={connStatus} />

          {/* Online members */}
          {onlineMembers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap max-w-xs">
              {onlineMembers.slice(0, 3).map(m => (
                <OnlinePill key={m.userId} member={m} />
              ))}
              {onlineMembers.length > 3 && (
                <span className="text-xs text-gray-400">+{onlineMembers.length - 3} more</span>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Disconnected banner ─────────────────────────────────────────── */}
        <AnimatePresence>
          {connStatus === 'disconnected' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                text-red-600 dark:text-red-400 text-xs font-medium px-4 py-2 rounded-lg
                flex items-center gap-2 mb-2 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              Connection lost — attempting to reconnect…
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Messages area ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto glass-card px-4 py-4 space-y-2 mb-3 min-h-0">
          {messages.length === 0 ? (
            /* ── Empty state ── */
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-900/20
                flex items-center justify-center text-4xl">
                💬
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  No messages yet
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                  Be the first to start the conversation with your team!
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {grouped.map(item =>
                item.type === 'date-divider' ? (
                  <DateDivider key={item.id} label={item.label} />
                ) : (
                  <MessageBubble
                    key={item._id}
                    msg={item}
                    isOwn={
                      // Compare as strings on both sides — sender._id is an ObjectId string
                      // from the socket/REST payload; user._id is a string from AuthContext.
                      item.sender?._id?.toString() === user?._id?.toString()
                    }
                    onDelete={setMsgToDelete}
                  />
                )
              )}
            </AnimatePresence>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Typing indicator ────────────────────────────────────────────── */}
        <AnimatePresence>
          {typers.length > 0 && (
            <TypingIndicator typers={typers} />
          )}
        </AnimatePresence>

        {/* ── Input area ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card px-3 py-3 flex items-end gap-2 shrink-0 mb-3"
        >
          {/* Current user avatar */}
          <div className="pb-1 shrink-0">
            <Avatar name={user?.name || '?'} />
          </div>

          {/* Text input */}
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            disabled={connStatus === 'disconnected'}
            className="flex-1 resize-none bg-gray-50 dark:bg-gray-800/60 border border-gray-200
              dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900
              dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2
              focus:ring-primary-500 focus:border-transparent transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              leading-relaxed overflow-hidden"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          {/* Send button */}
          <button
            id="send-message-btn"
            onClick={handleSend}
            disabled={!input.trim() || connStatus === 'disconnected'}
            className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white
              flex items-center justify-center transition-colors shrink-0 self-end
              disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send message (Enter)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </motion.div>
      </div>

      {/* ── Delete modal ─────────────────────────────────────────────────── */}
      <DeleteModal
        msg={msgToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setMsgToDelete(null)}
        deleting={deleting}
      />
    </>
  );
};

export default ProjectChat;
