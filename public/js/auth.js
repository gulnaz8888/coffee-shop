const authMsg = document.getElementById("authMsg");
const profileOut = document.getElementById("profileOut");

function toast(text, ok = true) {
  const el = document.getElementById("authMsg") || document.getElementById("resultLine");
  if (!el) return alert(text);
  el.textContent = text;
  el.style.borderColor = ok ? "#d9d9d9" : "#e0b4b4";
  el.style.background = ok ? "#ffffff" : "#fff5f5";
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readFormValue(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el ? String(el.value || "").trim() : "";
}

function validateRegister({ name, email, password }) {
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Full name is too short.";
  if (!email) return "Email is required.";
  if (!isEmail(email)) return "Please enter a valid email address.";
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

function validateLogin({ email, password }) {
  if (!email) return "Email is required.";
  if (!isEmail(email)) return "Please enter a valid email address.";
  if (!password) return "Password is required.";
  return null;
}

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      
      const validationError = validateRegister({ name, email, password });
      if (validationError) {
        toast(validationError, false);
        return;
      }
      
      try {
        const data = await api('/api/auth/register', 'POST', { name, email, password });
        window.authStore.setToken(data.token);
        toast('Registration successful!', true);
      } catch (err) {
        toast(err.message || 'Registration failed', false);
      }
    });
  }
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      const validationError = validateLogin({ email, password });
      if (validationError) {
        toast(validationError, false);
        return;
      }
      
      try {
        const data = await api('/api/auth/login', 'POST', { email, password });
        window.authStore.setToken(data.token);
        toast('Login successful!', true);
      } catch (err) {
        toast(err.message || 'Login failed', false);
      }
    });
  }
  
  const loadProfileBtn = document.getElementById('loadProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileOut = document.getElementById('profileOut');
  
  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', async function() {
      try {
        const data = await apiAuth('/api/users/profile', 'GET');
        profileOut.textContent = JSON.stringify(data, null, 2);
        toast('Profile loaded', true);
      } catch (err) {
        profileOut.textContent = 'Error: ' + err.message;
        toast('Failed to load profile', false);
      }
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      window.authStore.clearToken();
      toast('Logged out', true);
      if (profileOut) profileOut.textContent = '';
    });
  }
});