// ---------------- GLOBAL UTILS ----------------
const API = '/api';
const token = () => localStorage.getItem('token');

function authFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (token()) opts.headers['Authorization'] = 'Bearer ' + token();
  return fetch(url, opts);
}

// Block dashboard if not logged in
if (location.pathname !== '/' && location.pathname !== '/auth.html') {
  if (!token()) location = '/';
}

// ---------------- INITIAL LOAD ----------------
document.addEventListener('DOMContentLoaded', () => {

  // Sidebar switching
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const section = link.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.add('d-none'));
      document.getElementById('section-' + section).classList.remove('d-none');

      document.getElementById('pageTitle').innerText =
        section.charAt(0).toUpperCase() + section.slice(1);
    });
  });

  // Decode token & show email
  try {
    const t = token();
    if (t) {
      const payload = JSON.parse(atob(t.split('.')[1]));
      document.getElementById('adminEmail').innerText = payload.email || '';
    }
  } catch {}

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    location = '/';
  });

  initCategories();
  initCoupons();
});



// ====================================================================================
//                                      CATEGORIES
// ====================================================================================
function initCategories() {

  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('preview');
  let uploadedImagePath = '';

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('border-primary'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('border-primary'));
  drop.addEventListener('drop', async e => {
    e.preventDefault();
    drop.classList.remove('border-primary');
    handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  function catAlert(msg, type = 'danger') {
    document.getElementById('catAlert').innerHTML =
      `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(() => document.getElementById('catAlert').innerHTML = '', 3000);
  }

  async function handleFile(file) {
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) return catAlert('Only PNG, JPG, WEBP allowed');
    if (file.size > 3 * 1024 * 1024) return catAlert('Max size 3MB');

    preview.src = URL.createObjectURL(file);
    preview.classList.remove('d-none');

    const fd = new FormData();
    fd.append('image', file);

    try {
      const res = await authFetch(API + '/upload/image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) return catAlert(data.message || 'Upload failed');

      uploadedImagePath = data.path;
      catAlert('Image uploaded', 'success');

    } catch {
      catAlert('Network error');
    }
  }

  // SAVE CATEGORY
  document.getElementById('saveCat').addEventListener('click', async () => {
    const title = document.getElementById('catTitle').value.trim();
    const editingId = document.getElementById('editingCatId').value;

    if (!title) return catAlert('Enter title');
    if (!uploadedImagePath && !editingId) return catAlert('Upload image first');

    const body = { title };
    if (uploadedImagePath) body.imagePath = uploadedImagePath;

    try {
      let res;

      if (editingId) {
        res = await authFetch(API + '/categories/' + editingId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await authFetch(API + '/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      const data = await res.json();
      if (!res.ok) return catAlert(data.message || 'Save failed');

      catAlert(editingId ? 'Category updated' : 'Category saved', 'success');
      resetCatForm();
      loadCategories();

    } catch {
      catAlert('Network error');
    }
  });

  function resetCatForm() {
    document.getElementById('catTitle').value = '';
    document.getElementById('editingCatId').value = '';
    document.getElementById('cancelCatEdit').classList.add('d-none');
    preview.classList.add('d-none');
    uploadedImagePath = '';
  }

  document.getElementById('cancelCatEdit').addEventListener('click', resetCatForm);


  // ================== LOAD CATEGORIES (WITH DELETE BUTTON) ==================
  async function loadCategories() {
    try {
      const res = await authFetch(API + '/categories');
      if (!res.ok) throw new Error();
      const list = await res.json();

      const container = document.getElementById('catsList');
      container.innerHTML = "";

      list.forEach(c => {
        const div = document.createElement("div");
        div.className = "p-2 border rounded mb-2";

        div.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div class="d-flex align-items-center">
              <img src="${c.imagePath}" class="thumb me-2">
              <div>
                <strong>${c.title}</strong><br>
                <small>${new Date(c.createdAt).toLocaleString()}</small>
              </div>
            </div>

            <div class="d-flex align-items-center gap-3">
              <button class="btn btn-sm btn-primary edit-btn" data-id="${c._id}">Edit</button>

              <span class="delete-btn" data-id="${c._id}">
                Delete
              </span>
            </div>
          </div>
        `;

        container.appendChild(div);
      });

      // HANDLE DELETE EVENTS
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteCategory(btn.dataset.id));
      });

      // HANDLE EDIT EVENTS
      document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => editCategory(btn.dataset.id));
      });

      // Also refresh coupon selector
      const sel = document.getElementById('couponCat');
      sel.innerHTML = `<option value="">-- Select category --</option>` +
        list.map(c => `<option value="${c._id}">${c.title}</option>`).join('');

    } catch {
      document.getElementById('catsList').innerHTML =
        `<div class="text-danger">Failed to load</div>`;
    }
  }


  // DELETE CATEGORY
  async function deleteCategory(id) {
    if (!confirm("Delete this category?")) return;

    try {
      const res = await authFetch(API + '/categories/' + id, { method: "DELETE" });
      if (!res.ok) return alert("Delete failed");

      loadCategories();
    } catch {
      alert("Network error");
    }
  }


  // EDIT CATEGORY
  window.editCategory = async function (id) {
    try {
      const res = await authFetch(API + '/categories');
      const list = await res.json();
      const cat = list.find(x => x._id === id);
      if (!cat) return alert("Category not found");

      document.getElementById('catTitle').value = cat.title;
      document.getElementById('editingCatId').value = cat._id;
      document.getElementById('cancelCatEdit').classList.remove('d-none');

      preview.src = cat.imagePath;
      preview.classList.remove('d-none');
      uploadedImagePath = '';

    } catch {
      alert("Error loading category");
    }
  };

  loadCategories();
}



// ====================================================================================
//                                          COUPONS
// ====================================================================================
function initCoupons() {

  const alertBox = (msg, type = 'danger') => {
    document.getElementById('couponAlert').innerHTML =
      `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(() => document.getElementById('couponAlert').innerHTML = '', 3000);
  };


  // SAVE COUPON
  document.getElementById('saveCoupon').addEventListener('click', async () => {
    const title = document.getElementById('couponTitle').value.trim();
    const desc = document.getElementById('couponDesc').value.trim();
    const code = document.getElementById('couponCode').value.trim();
    const url = document.getElementById('couponUrl').value.trim();
    const cat = document.getElementById('couponCat').value || null;

    const editingId = document.getElementById('editingCouponId').value;

    if (!title || !code) return alertBox("Title and code required");

    const body = { title, description: desc, code, url, category: cat };

    try {
      let res;

      if (editingId) {
        res = await authFetch(API + '/coupons/' + editingId, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } else {
        res = await authFetch(API + '/coupons', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }

      const data = await res.json();
      if (!res.ok) return alertBox(data.message || "Save failed");

      alertBox(editingId ? "Coupon updated" : "Coupon saved", "success");
      resetCouponForm();
      loadCoupons();

    } catch {
      alertBox("Network error");
    }
  });


  function resetCouponForm() {
    document.getElementById('couponTitle').value = "";
    document.getElementById('couponDesc').value = "";
    document.getElementById('couponCode').value = "";
    document.getElementById('couponUrl').value = "";
    document.getElementById('editingCouponId').value = "";
    document.getElementById('cancelCouponEdit').classList.add("d-none");
  }

  document.getElementById('cancelCouponEdit').addEventListener('click', resetCouponForm);



  // ================= LOAD COUPONS + DELETE BUTTON =================
  async function loadCoupons() {
    try {
      const res = await authFetch(API + '/coupons');
      if (!res.ok) throw new Error();
      const list = await res.json();

      const container = document.getElementById('couponsList');
      container.innerHTML = "";

      list.forEach(c => {
        const div = document.createElement("div");
        div.className = "p-2 border rounded mb-2";

        div.innerHTML = `
          <div class="d-flex justify-content-between">
            
            <div>
              <strong>${c.title}</strong> 
              <small class="text-muted">[${c.code}]</small><br>
              <div class="coupon-description">${c.description || ''}</div>
              <div>Category: ${c.category ? c.category.title : '<em>none</em>'}</div>
              <div>${c.url ? `<a href="${c.url}" target="_blank">Open URL</a>` : ''}</div>
            </div>

            <div class="d-flex align-items-start gap-3">
              <button class="btn btn-sm btn-primary edit-coupon-btn" data-id="${c._id}">
                Edit
              </button>

              <span class="delete-btn" data-id="${c._id}">
                Delete
              </span>
            </div>

          </div>
        `;

        container.appendChild(div);
      });

      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteCoupon(btn.dataset.id));
      });

      document.querySelectorAll(".edit-coupon-btn").forEach(btn => {
        btn.addEventListener("click", () => loadCoupon(btn.dataset.id));
      });

    } catch {
      document.getElementById('couponsList').innerHTML =
        `<div class="text-danger">Failed to load</div>`;
    }
  }


  // DELETE COUPON
  async function deleteCoupon(id) {
    if (!confirm("Delete this coupon?")) return;

    try {
      const res = await authFetch(API + '/coupons/' + id, { method: "DELETE" });
      if (!res.ok) return alert("Delete failed");

      loadCoupons();

    } catch {
      alert("Network error");
    }
  }


  // LOAD COUPON FOR EDITING
  async function loadCoupon(id) {
    try {
      const res = await authFetch(API + '/coupons');
      const list = await res.json();
      const c = list.find(x => x._id === id);
      if (!c) return alert("Coupon not found");

      document.getElementById('couponTitle').value = c.title;
      document.getElementById('couponDesc').value = c.description || "";
      document.getElementById('couponCode').value = c.code;
      document.getElementById('couponUrl').value = c.url || "";
      document.getElementById('couponCat').value = c.category ? c.category._id : "";
      document.getElementById('editingCouponId').value = id;
      document.getElementById('cancelCouponEdit').classList.remove("d-none");

    } catch {
      alert("Error loading coupon");
    }
  }

  loadCoupons();
}

