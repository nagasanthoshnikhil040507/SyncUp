import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import {
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  downloadProjectFile,
} from '../api/fileApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.zip'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

const isImage = (mime) => mime?.startsWith('image/');
const isPDF   = (mime) => mime === 'application/pdf';
const isPreviewable = (mime) => isImage(mime) || isPDF(mime);

// Map MIME → icon + colour
const getFileIcon = (mime) => {
  if (isPDF(mime))   return { icon: '📄', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' };
  if (isImage(mime)) return { icon: '🖼️', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' };
  if (mime === 'text/plain') return { icon: '📝', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' };
  if (mime?.includes('zip')) return { icon: '🗜️', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
  if (mime?.includes('word')) return { icon: '📘', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' };
  return { icon: '📎', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
};

// ── Animation variants ────────────────────────────────────────────────────────
const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit:   { opacity: 0, x: -8, transition: { duration: 0.2 } },
};

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

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
    <div className="glass-card p-4 space-y-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
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
          className="mt-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5
            rounded-lg font-medium transition-colors text-sm">
          ← Back to Project
        </button>
      </div>
    </motion.div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent }) => (
  <motion.div variants={rowVariants} className="glass-card p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
    </div>
  </motion.div>
);

// ── Drop Zone (Upload area) ───────────────────────────────────────────────────
const DropZone = ({ onFileSelect, uploading, progress }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
        ${dragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]'
        }
        ${uploading ? 'pointer-events-none opacity-80' : 'cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'}`}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])}
        disabled={uploading}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl">⏫</span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading…</p>
          {/* Progress bar */}
          <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-400">{progress}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={`text-4xl transition-transform duration-200 ${dragging ? 'scale-125' : ''}`}>
            {dragging ? '📂' : '📁'}
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {dragging ? 'Drop file here' : 'Drag & drop or click to browse'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, ZIP · Max 20 MB
          </p>
        </div>
      )}
    </div>
  );
};

// ── Preview Modal ─────────────────────────────────────────────────────────────
const PreviewModal = ({ file, blobUrl, onClose }) => (
  <AnimatePresence>
    {file && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] glass-card overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10 shrink-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[80%]">
              {file.originalName}
            </p>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[300px]">
            {!blobUrl ? (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <span className="text-5xl animate-pulse">⏳</span>
                <p className="text-sm">Loading preview…</p>
              </div>
            ) : isImage(file.fileType) ? (
              <img
                src={blobUrl}
                alt={file.originalName}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : isPDF(file.fileType) ? (
              <iframe
                src={blobUrl}
                title={file.originalName}
                className="w-full h-[70vh]"
              />
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteModal = ({ file, onConfirm, onCancel, deleting }) => (
  <AnimatePresence>
    {file && (
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete File?</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              "{file.originalName}"
            </span>?
            {' '}This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={deleting}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors text-sm font-medium disabled:opacity-50">
              Cancel
            </button>
            <button id="confirm-delete-file-btn" onClick={onConfirm} disabled={deleting}
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

// ── File row ──────────────────────────────────────────────────────────────────
const FileRow = ({ file, onPreview, onDownload, onDelete, isDownloading }) => {
  const { icon, color } = getFileIcon(file.fileType);
  const canPreview = isPreviewable(file.fileType);

  return (
    <motion.tr
      layout
      variants={rowVariants}
      exit="exit"
      className="group border-b border-gray-100 dark:border-white/5 last:border-0
        hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors duration-150"
    >
      {/* Icon */}
      <td className="px-4 py-3 w-12">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${color}`}>
          {icon}
        </div>
      </td>

      {/* Name */}
      <td className="px-4 py-3 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">
          {file.originalName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
          {file.fileType.split('/')[1]?.replace('vnd.openxmlformats-officedocument.wordprocessingml.document','docx') || 'file'}
        </p>
      </td>

      {/* Uploaded by */}
      <td className="px-4 py-3 w-36 hidden sm:table-cell">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {file.uploadedBy?.name || '—'}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 w-24 hidden md:table-cell">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatBytes(file.fileSize)}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-3 w-32 hidden lg:table-cell">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(file.createdAt)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 w-28">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {/* Preview / View */}
          {canPreview && (
            <button
              id={`preview-file-${file._id}`}
              onClick={() => onPreview(file)}
              title="Preview"
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600
                hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}

          {/* Download */}
          <button
            id={`download-file-${file._id}`}
            onClick={() => onDownload(file)}
            disabled={isDownloading === file._id}
            title="Download"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600
              hover:bg-emerald-50 dark:hover:bg-emerald-900/20
              disabled:opacity-50 transition-colors duration-150"
          >
            {isDownloading === file._id ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-300/30 border-t-gray-500 rounded-full animate-spin block" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>

          {/* Delete */}
          <button
            id={`delete-file-${file._id}`}
            onClick={() => onDelete(file)}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
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

// ── ProjectFiles Page ─────────────────────────────────────────────────────────
const ProjectFiles = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject]   = useState(null);
  const [files, setFiles]       = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);

  // Upload state
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]  = useState(null);

  // Delete state
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(null); // fileId

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch project + files ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [projRes, filesRes] = await Promise.all([
        axiosInstance.get(`/projects/${projectId}`),
        getProjectFiles(projectId),
      ]);
      setProject(projRes.data.project);
      setFiles(filesRes.data.files);
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

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (previewBlob) URL.revokeObjectURL(previewBlob); };
  }, [previewBlob]);

  // ── Client-side file validation ────────────────────────────────────────────
  const validateFile = (file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, ZIP';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is 20 MB (your file: ${formatBytes(file.size)})`;
    }
    return null;
  };

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleFileSelect = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      showToast('error', validationError);
      return;
    }
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadProjectFile(projectId, file, (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      setFiles((prev) => [res.data.file, ...prev]);
      showToast('success', `"${file.name}" uploaded successfully`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      setUploadError(msg);
      showToast('error', msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Preview handler ───────────────────────────────────────────────────────
  const handlePreview = async (file) => {
    setPreviewFile(file);
    setPreviewBlob(null); // show loading state first
    try {
      const res = await downloadProjectFile(file._id);
      const blob = new Blob([res.data], { type: file.fileType });
      const url  = URL.createObjectURL(blob);
      setPreviewBlob(url);
    } catch {
      showToast('error', 'Could not load preview');
      setPreviewFile(null);
    }
  };

  const closePreview = () => {
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    setPreviewBlob(null);
    setPreviewFile(null);
  };

  // ── Download handler ──────────────────────────────────────────────────────
  const handleDownload = async (file) => {
    setIsDownloading(file._id);
    try {
      const res = await downloadProjectFile(file._id);
      const blob    = new Blob([res.data], { type: file.fileType });
      const url     = URL.createObjectURL(blob);
      const anchor  = document.createElement('a');
      anchor.href   = url;
      anchor.download = file.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Download failed. Please try again.');
    } finally {
      setIsDownloading(null);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteProjectFile(fileToDelete._id);
      setFiles((prev) => prev.filter((f) => f._id !== fileToDelete._id));
      showToast('success', `"${fileToDelete.originalName}" deleted`);
      setFileToDelete(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Delete failed');
      setFileToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
  const lastUpload = files.length > 0 ? formatDate(files[0].createdAt) : '—';

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;
  if (errorType) return (
    <ErrorState type={errorType} onBack={() => navigate(`/projects/${projectId}`)} />
  );

  return (
    <>
      <Toast toast={toast} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6"
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
              Documents · {files.length} file{files.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="📁" label="Total Files"    value={files.length}         accent="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard icon="💾" label="Storage Used"   value={formatBytes(totalSize)} accent="bg-violet-50 dark:bg-violet-900/20" />
          <StatCard icon="🕐" label="Last Upload"    value={lastUpload}            accent="bg-emerald-50 dark:bg-emerald-900/20" />
        </motion.div>

        {/* ── Upload zone ── */}
        <motion.div variants={rowVariants} className="glass-card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span>⬆</span> Upload File
          </p>
          <DropZone
            onFileSelect={handleFileSelect}
            uploading={uploading}
            progress={uploadProgress}
          />
          {/* Upload error */}
          <AnimatePresence>
            {uploadError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5"
              >
                <span>⚠</span> {uploadError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── File list ── */}
        <motion.div variants={rowVariants} className="glass-card overflow-hidden">
          {files.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 px-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-4xl">
                📂
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  No documents uploaded yet
                </h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs">
                  Upload your first file using the area above. PDF, images, docs, and more are supported.
                </p>
              </div>
            </div>
          ) : (
            /* ── File table ── */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10">
                    <th className="px-4 py-3 w-12" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36 hidden sm:table-cell">
                      Uploaded By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 hidden md:table-cell">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32 hidden lg:table-cell">
                      Upload Date
                    </th>
                    <th className="px-4 py-3 w-28">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                  <AnimatePresence mode="popLayout">
                    {files.map((file) => (
                      <FileRow
                        key={file._id}
                        file={file}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onDelete={setFileToDelete}
                        isDownloading={isDownloading}
                      />
                    ))}
                  </AnimatePresence>
                </motion.tbody>
              </table>
              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5
                text-xs text-gray-400 dark:text-gray-500">
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)} total
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Modals ── */}
      <PreviewModal
        file={previewFile}
        blobUrl={previewBlob}
        onClose={closePreview}
      />

      <DeleteModal
        file={fileToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setFileToDelete(null)}
        deleting={deleting}
      />
    </>
  );
};

export default ProjectFiles;
