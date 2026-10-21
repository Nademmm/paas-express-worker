const form = document.getElementById("student-form");
const studentId = document.getElementById("student-id");
const nameInput = document.getElementById("name");
const classInput = document.getElementById("class-name");
const rows = document.getElementById("student-rows");
const message = document.getElementById("message");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

function notify(text) {
  message.textContent = text;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "HTTP " + response.status);
  return body;
}

function td(text) {
  const item = document.createElement("td");
  item.textContent = String(text ?? "");
  return item;
}

function resetForm() {
  form.reset();
  studentId.value = "";
  saveBtn.textContent = "Tambah siswa";
  cancelBtn.hidden = true;
}

async function loadStudents() {
  const response = await api("/api/students");
  const students = Array.isArray(response.data) ? response.data : [];
  rows.replaceChildren();
  if (students.length === 0) {
    const tr = document.createElement("tr");
    const empty = td("Belum ada data");
    empty.colSpan = 4;
    tr.append(empty);
    rows.append(tr);
    return;
  }
  for (const student of students) {
    const tr = document.createElement("tr");
    const actions = document.createElement("td");
    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.type = "button";
    edit.addEventListener("click", () => {
      studentId.value = student.id;
      nameInput.value = student.name;
      classInput.value = student.class_name;
      saveBtn.textContent = "Simpan perubahan";
      cancelBtn.hidden = false;
      nameInput.focus();
    });
    const remove = document.createElement("button");
    remove.textContent = "Hapus";
    remove.type = "button";
    remove.className = "danger";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Hapus siswa fiktif ini?")) return;
      try {
        await api("/api/students/" + student.id, { method: "DELETE" });
        if (studentId.value === String(student.id)) resetForm();
        await loadStudents();
        notify("Data berhasil dihapus.");
      } catch (error) {
        notify("Gagal menghapus: " + error.message);
      }
    });
    actions.append(edit, remove);
    tr.append(td(student.id), td(student.name), td(student.class_name), actions);
    rows.append(tr);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const class_name = classInput.value.trim();
  if (!name || !class_name) { notify("Isi nama dan kelas."); return; }
  const editingId = studentId.value;
  const path = editingId ? "/api/students/" + editingId : "/api/students";
  try {
    await api(path, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify({ name, class_name })
    });
    resetForm();
    await loadStudents();
    notify("Data berhasil disimpan.");
  } catch (error) {
    notify("Gagal menyimpan: " + error.message);
  }
});

cancelBtn.addEventListener("click", resetForm);
document.getElementById("refresh-btn").addEventListener("click", async () => {
  try { await loadStudents(); notify("Data diperbarui."); }
  catch (error) { notify("Gagal memuat: " + error.message); }
});
loadStudents().catch((error) => notify("Gagal memuat: " + error.message));