document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById('alert').innerHTML =
      '<div class="alert alert-danger">' + (data.message || 'Login failed') + '</div>';
    return;
  }

  // SAVE JWT IN LOCALSTORAGE (FOR FRONTEND FETCH)
  localStorage.setItem('token', data.token);

  // ALSO SAVE JWT IN COOKIE (FOR SERVER PAGE PROTECTION)
  document.cookie = `token=${data.token}; path=/; Secure; SameSite=Lax`;

  window.location = 'dashboard.html';
});
