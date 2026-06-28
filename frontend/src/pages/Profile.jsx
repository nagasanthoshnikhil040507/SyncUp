import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const Profile = () => {
  const { user, login, logout, token } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize name when user data is available
  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const res = await axiosInstance.put('/users/profile', { name });
      if (res.data.success) {
        // Update the context with new user data
        login(token, res.data.user);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark p-4"
    >
      <div className="glass-card p-8 w-full max-w-md relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👤 Profile</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false);
                setName(user.name);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

        {user ? (
          <div className="space-y-4 mb-8 text-left">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-800 dark:text-gray-200 font-medium">{user.name}</p>
              )}
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Email</p>
              <p className="text-gray-800 dark:text-gray-200 font-medium">{user.email}</p>
            </div>

            <div className="pb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Role</p>
              <span className="inline-block bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                {user.role}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center mb-6">Loading user data...</p>
        )}

        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 mb-3 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        ) : null}

        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Logout
        </button>
      </div>
    </motion.div>
  );
};

export default Profile;
