import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// ── Field-level validation ──────────────────────────────────────────────────
const validate = ({ name, email, password, confirmPassword }) => {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Name is required';
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

// ── Reusable field component ───────────────────────────────────────────────
const Field = ({ id, label, type, placeholder, value, onChange, error, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500
        bg-white dark:bg-gray-800 dark:border-gray-700 transition
        disabled:opacity-50
        ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
    />
    <AnimatePresence>
      {error && (
        <motion.p
          key={error}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-red-500 text-xs mt-1"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

// ── Register page ──────────────────────────────────────────────────────────
const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    // Client-side validation
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (response.data.success) {
        setSuccessMessage('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1800);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark px-4"
    >
      <div className="glass-card p-8 w-full max-w-md">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
          Join SyncUp and start collaborating
        </p>

        {/* Server error banner */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm"
            >
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="register-name"
            label="Name"
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            disabled={isLoading}
          />
          <Field
            id="register-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            error={fieldErrors.email}
            disabled={isLoading}
          />
          <Field
            id="register-password"
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange('password')}
            error={fieldErrors.password}
            disabled={isLoading}
          />
          <Field
            id="register-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={fieldErrors.confirmPassword}
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700
              transition disabled:opacity-50 mt-2 font-medium"
          >
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* Login link */}
        <p className="text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default Register;
