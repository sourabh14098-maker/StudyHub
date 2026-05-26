/* StudyHub - Main Shared Script */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  highlightActiveLink();
  initHeaderScroll();
  initScrollToTop();
  initFooterUploadGuard();
});

// 1. Session-based Navbar Rendering
function initNavbar() {
  const header = document.querySelector('header');
  if (!header) return;

  const user = getCurrentUser();
  const navContainer = document.querySelector('.navbar-wrapper');
  
  if (!navContainer) return;

  let navItemsHtml = `
    <li><a href="index.html" class="nav-link" data-page="index">Home</a></li>
    <li><a href="notes.html" class="nav-link" data-page="notes">Notes</a></li>
    <li><a href="contact.html" class="nav-link" data-page="contact">Contact</a></li>
  `;

  let authButtonsHtml = '';

  if (user) {
    navItemsHtml = `
      <li><a href="index.html" class="nav-link" data-page="index">Home</a></li>
      <li><a href="notes.html" class="nav-link" data-page="notes">Browse Notes</a></li>
      <li><a href="upload.html" class="nav-link" data-page="upload">Upload</a></li>
      <li><a href="dashboard.html" class="nav-link" data-page="dashboard">Dashboard</a></li>
    `;

    // Admin Panel link if role is admin
    if (user.role === 'admin') {
      navItemsHtml += `<li><a href="admin.html" class="nav-link" data-page="admin">Admin Panel</a></li>`;
    }

    navItemsHtml += `<li><a href="contact.html" class="nav-link" data-page="contact">Contact</a></li>`;

    // Profile badge and logout button
    authButtonsHtml = `
      <div class="nav-auth-inner">
        <span class="nav-user-badge">
          <i data-lucide="user" style="width: 14px; height: 14px;"></i>
          ${user.username} (${user.role === 'admin' ? 'Admin' : 'Student'})
        </span>
        <button type="button" class="logout-btn btn btn-sm btn-outline">
          <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
          Logout
        </button>
      </div>
    `;
  } else {
    // Guest buttons
    authButtonsHtml = `
      <a href="login.html" class="btn btn-sm btn-outline">Log In</a>
      <a href="login.html?tab=signup" class="btn btn-sm btn-primary">Sign Up</a>
    `;
  }

  // Update navbar layout
  navContainer.innerHTML = `
    <a href="index.html" class="logo">
      <i data-lucide="graduation-cap" style="width: 32px; height: 32px; stroke-width: 2.5;"></i>
      StudyHub<span class="logo-dot">.</span>
    </a>
    
    <nav>
      <ul class="nav-links">
        ${navItemsHtml}
      </ul>
    </nav>
    
    <div class="nav-auth-buttons">
      ${authButtonsHtml}
    </div>
    
    <button type="button" class="hamburger" aria-label="Toggle navigation" aria-expanded="false">
      <i data-lucide="menu"></i>
    </button>
  `;

  // Initialize Lucide Icons after modifying DOM
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Handle Logout Event
  const logoutBtns = document.querySelectorAll('.logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });

  // Mobile menu: backdrop, toggle, close on link tap
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  let navBackdrop = document.querySelector('.nav-backdrop');

  if (!navBackdrop) {
    navBackdrop = document.createElement('div');
    navBackdrop.className = 'nav-backdrop';
    navBackdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(navBackdrop);
  }

  function setMobileNavOpen(isOpen) {
    if (!navLinks || !hamburger) return;
    navLinks.classList.toggle('active', isOpen);
    hamburger.classList.toggle('is-active', isOpen);
    navBackdrop.classList.toggle('is-visible', isOpen);
    document.body.classList.toggle('nav-menu-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.innerHTML = isOpen ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
    if (window.lucide) window.lucide.createIcons();
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      setMobileNavOpen(!navLinks.classList.contains('active'));
    });

    navBackdrop.addEventListener('click', () => setMobileNavOpen(false));

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) setMobileNavOpen(false);
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) setMobileNavOpen(false);
    });
  }
}

// 2. Highlight Active Page Link
function highlightActiveLink() {
  const currentPath = window.location.pathname;
  const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1).replace('.html', '');
  const targetPage = pageName === '' || pageName === 'index' ? 'index' : pageName;
  
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('data-page') === targetPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// 3. Header Scroll Styling
function initHeaderScroll() {
  const header = document.querySelector('header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Scroll to Top functionality
function initScrollToTop() {
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-top-btn';
  scrollBtn.setAttribute('aria-label', 'Scroll to top');
  scrollBtn.innerHTML = '<i data-lucide="arrow-up" style="width: 20px; height: 20px;"></i>';
  document.body.appendChild(scrollBtn);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// 4. Global Toast Notification System
function showToast(message, type = 'success') {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'danger') iconName = 'alert-triangle';
  if (type === 'warning') iconName = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);
  
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Auto remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 4000);
}

// Helper authentication getters (falls back safely if auth.js isn't parsed yet)
function getCurrentUser() {
  try {
    const userJson = localStorage.getItem('sh_logged_in_user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    return null;
  }
}

function logout() {
  localStorage.removeItem('sh_logged_in_user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// 5. Footer Upload Link Guard
function initFooterUploadGuard() {
  const footerUploadLink = document.getElementById('footerUploadLink');
  if (footerUploadLink) {
    footerUploadLink.addEventListener('click', (e) => {
      if (!getCurrentUser()) {
        e.preventDefault();
        showToast('Please log in first to upload notes', 'warning');
        setTimeout(() => {
          window.location.href = 'login.html?redirect=upload.html';
        }, 1000);
      }
    });
  }
}
