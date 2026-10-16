const STORAGE_KEY = "pmbData";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const routes = {
  identitas: "Identitas.html",
  pendidikan: "Pendidikan.html",
  pendaftaran: "Pendaftaran.html",
  pembayaran: "DataTransaksiPembayaran.html"
};

function getData() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showMessage(type, title, items = []) {
  const box = document.getElementById("message");
  if (!box) return;

  box.hidden = false;
  box.className = "notice " + type;
  box.replaceChildren();

  const heading = document.createElement("strong");
  heading.textContent = title;
  box.appendChild(heading);

  if (items.length) {
    const list = document.createElement("ul");

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    box.appendChild(list);
  }

  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearMessage() {
  const box = document.getElementById("message");
  if (!box) return;

  box.hidden = true;
  box.className = "notice";
  box.replaceChildren();
}

// Mengambil kembali data teks yang sudah disimpan.
function restoreForm(form) {
  const data = getData();

  Object.entries(data).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);

    // Input file tidak dapat diisi kembali oleh JavaScript.
    if (!field || field.type === "file" || field.type === "checkbox") {
      return;
    }

    field.value = value;
  });
}

// Menyimpan data teks dari satu halaman.
function collectForm(form) {
  const data = getData();

  Array.from(form.elements).forEach((field) => {
    if (!field.name || field.disabled || field.type === "button" ||
        field.type === "submit" || field.type === "reset") {
      return;
    }

    if (field.type === "file") {
      // Yang disimpan hanya nama file, bukan isi file.
      if (field.files && field.files.length) {
        data[field.name + "_nama_file"] = field.files[0].name;
      }
      return;
    }

    if (field.type === "checkbox") {
      data[field.name] = field.checked;
      return;
    }

    data[field.name] = field.value;
  });

  saveData(data);
}

function labelOf(field) {
  const label = field.closest("label");
  if (!label) return field.name;

  return label.childNodes[0].textContent
    .replace("*", "")
    .trim();
}

// Validasi setiap kolom pada halaman aktif.
function validateForm(form) {
  const errors = [];

  form.querySelectorAll(".invalid").forEach((field) => {
    field.classList.remove("invalid");
  });

  form.querySelectorAll("[required]").forEach((field) => {
    const label = labelOf(field);

    if (field.type === "file") {
      if (!field.files || field.files.length === 0) {
        errors.push(label + " wajib diunggah.");
        field.classList.add("invalid");
      }
    } else if (field.type === "checkbox") {
      if (!field.checked) {
        errors.push(label + " wajib disetujui.");
        field.classList.add("invalid");
      }
    } else if (!field.value.trim()) {
      errors.push(label + " wajib diisi.");
      field.classList.add("invalid");
    } else if (!field.checkValidity()) {
      errors.push("Format " + label + " tidak valid.");
      field.classList.add("invalid");
    }
  });

  // Validasi khusus NIK dan NPSN.
  ["nik", "npsn"].forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field || !field.value) return;

    const expectedLength = name === "nik" ? 16 : 8;
    const pattern = new RegExp("^\\d{" + expectedLength + "}$");

    if (!pattern.test(field.value)) {
      errors.push(
        (name === "nik" ? "NIK" : "NPSN") +
        " harus terdiri dari " + expectedLength + " digit angka."
      );
      field.classList.add("invalid");
    }
  });

  // Nilai rapor dan UTBK harus berada dalam rentang yang ditentukan.
  [
    ["nilai_rapor", 0, 100, "Nilai rapor"],
    ["skor_utbk", 0, 1000, "Skor UTBK"]
  ].forEach(([name, min, max, label]) => {
    const field = form.elements.namedItem(name);
    if (!field || field.value === "") return;

    const value = Number(field.value);

    if (!Number.isFinite(value) || value < min || value > max) {
      errors.push(label + " harus berada di antara " + min + " dan " + max + ".");
      field.classList.add("invalid");
    }
  });

  // Nomor telepon.
  ["nomor_hp", "telepon_ortu"].forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field || !field.value) return;

    if (!/^[0-9+\-\s]{9,16}$/.test(field.value)) {
      errors.push("Format " + labelOf(field) + " tidak valid.");
      field.classList.add("invalid");
    }
  });

  // Pilihan prodi harus berbeda.
  const prodi1 = form.elements.namedItem("prodi1");
  const prodi2 = form.elements.namedItem("prodi2");

  if (prodi1 && prodi2 && prodi1.value &&
      prodi1.value === prodi2.value) {
    errors.push("Pilihan program studi 1 dan 2 tidak boleh sama.");
    prodi1.classList.add("invalid");
    prodi2.classList.add("invalid");
  }

  // Validasi ekstensi dan ukuran file.
  form.querySelectorAll('input[type="file"]').forEach((field) => {
    if (!field.files || !field.files.length) return;

    const file = field.files[0];
    const extension = file.name.split(".").pop().toLowerCase();
    const allowed = (field.dataset.ext || "").split(",");

    if (!allowed.includes(extension)) {
      errors.push("Format file " + labelOf(field) + " tidak didukung.");
      field.classList.add("invalid");
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push("Ukuran " + labelOf(field) + " maksimal 5 MB.");
      field.classList.add("invalid");
    }
  });

  return errors;
}

function showSummary() {
  const data = getData();

  const summaryFields = {
    sumNama: data.nama,
    sumEmail: data.email,
    sumJalur: data.jalur,
    sumProdi1: data.prodi1,
    sumProdi2: data.prodi2,
    sumLokasi: data.lokasi_ujian
  };

  Object.entries(summaryFields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value || "Belum diisi";
    }
  });
}

// Pasang fitur pada form yang tersedia di halaman aktif.
document.querySelectorAll("form[data-page]").forEach((form) => {
  restoreForm(form);

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      field.classList.remove("invalid");
    });

    field.addEventListener("change", () => {
      field.classList.remove("invalid");
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage();

    const errors = validateForm(form);

    if (errors.length) {
      showMessage(
        "error",
        "Periksa kembali formulir Anda:",
        errors
      );

      form.querySelector(".invalid")?.focus();
      return;
    }

    collectForm(form);

    const page = form.dataset.page;

    if (page === "identitas") {
      window.location.href = routes.pendidikan;
    } else if (page === "pendidikan") {
      window.location.href = routes.pendaftaran;
    } else if (page === "pendaftaran") {
      window.location.href = routes.pembayaran;
    } else if (page === "pembayaran") {
      showMessage(
        "success",
        "Konfirmasi berhasil!",
        [
          "Seluruh kolom pada halaman ini telah lolos validasi.",
          "Ini hanya simulasi front-end. Pendaftaran belum dikirim ke server."
        ]
      );
    }
  });
});

// Tampilkan ringkasan saat halaman pembayaran dibuka.
showSummary();