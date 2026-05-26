/* StudyHub - Authentication Controller */

// Default Seed Users
const DEFAULT_USERS = [
  {
    id: "user_admin",
    username: "admin",
    email: "admin@studyhub.com",
    password: "admin123",
    role: "admin"
  },
  {
    id: "user_student",
    username: "sourav_s",
    email: "student@studyhub.com",
    password: "student123",
    role: "student"
  }
];

// Initialize users database on script load
(function initUsersDB() {
  if (!localStorage.getItem('sh_users')) {
    localStorage.setItem('sh_users', JSON.stringify(DEFAULT_USERS));
  }
})();

// Get all users
function getUsers() {
  return JSON.parse(localStorage.getItem('sh_users') || '[]');
}

// Save users
function saveUsers(users) {
  localStorage.setItem('sh_users', JSON.stringify(users));
}

// Current session
function getCurrentUser() {
  const session = localStorage.getItem('sh_logged_in_user');
  return session ? JSON.parse(session) : null;
}

// Login logic
function loginUser(email, password) {
  const users = getUsers();
  const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
  
  if (matchedUser) {
    // Save to session (excluding password for standard security practice)
    const sessionUser = {
      id: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role
    };
    localStorage.setItem('sh_logged_in_user', JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }
  
  return { success: false, error: 'Invalid email or password' };
}

// Register student logic
function registerUser(username, email, password) {
  const users = getUsers();
  
  // Checks
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
    return { success: false, error: 'Email already registered' };
  }
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
    return { success: false, error: 'Username already taken' };
  }
  
  const newUser = {
    id: 'user_' + Date.now(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    role: 'student' // default is student
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Auto-login after registration
  const sessionUser = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role
  };
  localStorage.setItem('sh_logged_in_user', JSON.stringify(sessionUser));
  
  return { success: true, user: sessionUser };
}

// Route Guard
function guardPage(allowedRoles = []) {
  const user = getCurrentUser();
  
  if (!user) {
    // If not logged in, redirect to login page
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If logged in but does not have the required role, redirect to Home/Dashboard
    alert('Access Denied: You do not have permission to view this page.');
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    return false;
  }
  
  return true;
}
