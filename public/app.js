const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const currentUserText = document.getElementById("current-user");

const studentEditor = document.getElementById("student-editor");
const studentForm = document.getElementById("student-form");
const studentIdInput = document.getElementById("student-id");
const nameInput = document.getElementById("name");
const classInput = document.getElementById("class-name");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const message = document.getElementById("message");
const rows = document.getElementById("student-rows");

let accessToken = null;
let currentUser = null;

function notify(text) {
  message.textContent = text;
}

function showLogin(text) {
  accessToken = null;
  currentUser = null;
  dashboard.hidden = true;
  loginPanel.hidden = false;
  rows.replaceChildren();
  studentForm.reset();
  loginForm.reset();
  loginMessage.textContent = text || "";
}

function logout() {
  showLogin("Anda sudah logout. Silakan login kembali.");
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", "Bearer " + accessToken);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && accessToken) {
      showLogin("Sesi berakhir atau token tidak valid. Silakan login kembali.");
    }

    throw new Error(body.error || ("HTTP " + response.status));
  }

  return body;
}

function cell(value) {
  const td = document.createElement("td");
  td.textContent = String(value ?? "");
  return td;
}

function resetStudentForm() {
  studentForm.reset();
  studentIdInput.value = "";
  saveButton.textContent = "Tambah siswa";
  cancelButton.hidden = true;
}

function applyRolePermissions() {
  const role = currentUser.role;

  studentEditor.hidden = role === "viewer";

  if (role === "viewer") {
    notify("Mode viewer: Anda hanya dapat membaca data.");
  } else {
    notify("Anda login sebagai " + role + ".");
  }
}

async function loadStudents() {
  const response = await api("/api/students");
  const students = Array.isArray(response.data) ? response.data : [];

  rows.replaceChildren();

  if (students.length === 0) {
    const tr = document.createElement("tr");
    const empty = cell("Belum ada data");
    empty.colSpan = 4;
    tr.append(empty);
    rows.append(tr);
    return;
  }

  for (const student of students) {
    const tr = document.createElement("tr");
    const actions = document.createElement("td");

    if (currentUser.role === "editor" || currentUser.role === "admin") {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        studentIdInput.value = String(student.id);
        nameInput.value = student.name;
        classInput.value = student.class_name;
        saveButton.textContent = "Simpan perubahan";
        cancelButton.hidden = false;
        nameInput.focus();
        studentEditor.scrollIntoView({ behavior: "smooth" });
      });
      actions.append(editButton);
    }

    if (currentUser.role === "admin") {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Hapus";
      deleteButton.className = "danger";
      deleteButton.addEventListener("click", async () => {
        if (!window.confirm("Hapus data siswa fiktif ini?")) return;

        try {
          await api("/api/students/" + student.id, { method: "DELETE" });
          if (studentIdInput.value === String(student.id)) {
            resetStudentForm();
          }
          await loadStudents();
          notify("Data berhasil dihapus.");
        } catch (error) {
          notify("Gagal menghapus: " + error.message);
        }
      });
      actions.append(deleteButton);
    }

    if (!actions.hasChildNodes()) {
      actions.textContent = "Tidak ada aksi";
    }

    tr.append(
      cell(student.id),
      cell(student.name),
      cell(student.class_name),
      actions
    );

    rows.append(tr);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Memeriksa akun...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    accessToken = result.token;
    currentUser = result.user;

    loginPanel.hidden = true;
    dashboard.hidden = false;
    currentUserText.textContent =
      currentUser.email + " — role: " + currentUser.role;

    applyRolePermissions();
    await loadStudents();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const class_name = classInput.value.trim();
  const editingId = studentIdInput.value;

  const path = editingId
    ? "/api/students/" + editingId
    : "/api/students";

  try {
    await api(path, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify({ name, class_name })
    });

    resetStudentForm();
    await loadStudents();
    notify("Data berhasil disimpan.");
  } catch (error) {
    notify("Gagal menyimpan: " + error.message);
  }
});

cancelButton.addEventListener("click", resetStudentForm);

document.getElementById("refresh-button").addEventListener("click", async () => {
  try {
    await loadStudents();
    notify("Data berhasil dimuat ulang.");
  } catch (error) {
    notify("Gagal memuat data: " + error.message);
  }
});

document.getElementById("logout-button").addEventListener("click", logout);

showLogin("");