/**
 * iceKnodcorp ATD System — logic Panel Admin (CRUD Karyawan)
 */

let adminUser = null;
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    renderBrand(document.querySelector('[data-brand]'));
    initSidebarToggle();

    adminUser = await guardSession({ adminOnly: true });
    if (!adminUser) return;

    document.getElementById('userName').textContent = adminUser.full_name;
    document.getElementById('userRole').textContent = `Admin • ${adminUser.employee_code}`;
    document.getElementById('userInitial').textContent = adminUser.full_name.charAt(0).toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    document.getElementById('addEmployeeBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('employeeForm').addEventListener('submit', handleSubmit);

    await loadEmployees();
    await loadLogs();
});

async function loadEmployees() {
    const res = await apiRequest('employees.php');
    const tbody = document.getElementById('employeeBody');
    const emptyEl = document.getElementById('employeeEmpty');

    if (!res.success || !res.data.employees.length) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
    }
    emptyEl.style.display = 'none';

    const rows = res.data.employees;
    document.getElementById('kpiTotal').textContent = rows.length;
    document.getElementById('kpiActive').textContent = rows.filter((r) => r.status === 'active').length;
    document.getElementById('kpiAdmin').textContent = rows.filter((r) => r.role === 'admin').length;

    tbody.innerHTML = rows.map((emp) => `
        <tr>
            <td data-label="Kode">${emp.employee_code}</td>
            <td data-label="Nama">${emp.full_name}</td>
            <td data-label="Email">${emp.email}</td>
            <td data-label="Departemen">${emp.department || '—'}</td>
            <td data-label="Role">${emp.role === 'admin' ? 'Admin' : 'Karyawan'}</td>
            <td data-label="Status">${emp.status === 'active' ? 'Aktif' : 'Nonaktif'}</td>
            <td data-label="Aksi">
                <button class="action-icon" data-edit="${emp.id}">Edit</button>
                <button class="action-icon danger" data-delete="${emp.id}">Hapus</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) =>
        btn.addEventListener('click', () => openModal(rows.find((r) => r.id === Number(btn.dataset.edit))))
    );
    tbody.querySelectorAll('[data-delete]').forEach((btn) =>
        btn.addEventListener('click', () => deleteEmployee(Number(btn.dataset.delete)))
    );
}

async function loadLogs() {
    const res = await apiRequest('activity_log.php');
    const list = document.getElementById('activityList');
    if (!res.success || !res.data.logs.length) {
        list.innerHTML = '<li class="empty-state">Belum ada aktivitas tercatat.</li>';
        return;
    }
    list.innerHTML = res.data.logs.slice(0, 12).map((log) => `
        <li>
            <strong>${log.action.replace(/_/g, ' ')}</strong>
            <span>${log.full_name ? `${log.full_name} — ` : ''}${log.description || ''}</span>
            <time>${formatDateTime(log.created_at)}</time>
        </li>
    `).join('');
}

function openModal(employee = null) {
    editingId = employee ? employee.id : null;
    document.getElementById('modalTitle').textContent = employee ? 'Edit Karyawan' : 'Tambah Karyawan';
    document.getElementById('empCode').value = employee?.employee_code || '';
    document.getElementById('empCode').disabled = !!employee; // kode tidak diubah setelah dibuat
    document.getElementById('empName').value = employee?.full_name || '';
    document.getElementById('empEmail').value = employee?.email || '';
    document.getElementById('empEmail').disabled = !!employee; // email dipakai untuk login, kunci saat edit
    document.getElementById('empDept').value = employee?.department || '';
    document.getElementById('empPosition').value = employee?.position || '';
    document.getElementById('empRole').value = employee?.role || 'employee';
    document.getElementById('empStatus').value = employee?.status || 'active';
    document.getElementById('empStatusRow').style.display = employee ? 'block' : 'none';
    document.getElementById('empPassword').value = '';
    document.getElementById('empPassword').placeholder = employee ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter';
    document.getElementById('modalAlert').className = 'alert';
    document.getElementById('employeeModal').classList.add('show');
}

function closeModal() {
    document.getElementById('employeeModal').classList.remove('show');
    editingId = null;
}

async function handleSubmit(e) {
    e.preventDefault();
    const alertEl = document.getElementById('modalAlert');
    hideAlert(alertEl);

    const payload = {
        employee_code: document.getElementById('empCode').value.trim(),
        full_name: document.getElementById('empName').value.trim(),
        email: document.getElementById('empEmail').value.trim(),
        department: document.getElementById('empDept').value.trim(),
        position: document.getElementById('empPosition').value.trim(),
        role: document.getElementById('empRole').value,
        status: document.getElementById('empStatus').value,
    };
    const password = document.getElementById('empPassword').value;
    if (password) payload.password = password;

    const submitBtn = document.getElementById('modalSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    const res = editingId
        ? await apiRequest(`employees.php?id=${editingId}`, { method: 'PUT', body: payload })
        : await apiRequest('employees.php', { method: 'POST', body: payload });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan';

    if (!res.success) {
        showAlert(alertEl, res.message || 'Gagal menyimpan data.');
        return;
    }

    closeModal();
    await loadEmployees();
    await loadLogs();
}

async function deleteEmployee(id) {
    if (!confirm('Hapus karyawan ini? Seluruh riwayat absensi terkait juga akan terhapus.')) return;
    const res = await apiRequest(`employees.php?id=${id}`, { method: 'DELETE' });
    if (!res.success) {
        alert(res.message || 'Gagal menghapus karyawan.');
        return;
    }
    await loadEmployees();
    await loadLogs();
}

// NOTE: Registrasi wajah untuk karyawan baru dilakukan mandiri oleh
// karyawan lewat halaman register.html (perlu akses kamera langsung).
// Admin di sini fokus pada pengelolaan data akun & role.
