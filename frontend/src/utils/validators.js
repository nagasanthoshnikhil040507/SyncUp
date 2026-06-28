/**
 * Validators
 *
 * Client-side validation functions for forms.
 * Used across auth forms, profile editing, group creation, etc.
 */

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  return password.length >= 8;
};

export const validateUsername = (username) => {
  // 3-30 characters, lowercase letters, numbers, underscores
  const regex = /^[a-z0-9_]{3,30}$/;
  return regex.test(username);
};

export const validateFullName = (name) => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};
