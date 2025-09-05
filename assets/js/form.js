// ===== Config =====
// Opção 1 (recomendada p/ GH Pages): usar Formspree
// 1) Crie um formulário em https://formspree.io/f/xxxxxx e troque o ENDPOINT abaixo
const FORMSPREE_ENDPOINT = "https://formspree.io/f/your-id"; // substitua pelo seu

// Se preferir EmailJS (sem backend), configure aqui
const USE_EMAILJS = false; // deixe false para usar Formspree

// ===== Util =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const form = $("#wizardForm");
const steps = $$(".step");
const progress = $("#progress");
const alertBox = $("#alert");
const review = $("#review");
const btnPrev = $("#btnPrev");
const btnNext = $("#btnNext");
const btnSubmit = $("#btnSubmit");
const btnSave = $("#btnSave");

let current = 1; // step atual

function showStep(n) {
  current = n;
  steps.forEach((s) => s.classList.add("hidden"));
  const active = steps.find((s) => Number(s.dataset.step) === n);
  if (active) active.classList.remove("hidden");

  // progress
  const w = (n / steps.length) * 100;
  progress.style.width = `${w}%`;

  // botões
  btnPrev.disabled = n === 1;
  btnNext.classList.toggle("hidden", n === steps.length);
  btnSubmit.classList.toggle("hidden", n !== steps.length);

  // aviso/alerta
  hideAlert();

  // se for revisão, montar resumo
  if (n === steps.length) buildReview();

  // foco no primeiro campo do passo
  const firstInput = active.querySelector("input, select, textarea, button");
  firstInput && firstInput.focus();
}

function showAlert(msg, type = "warn") {
  alertBox.textContent = msg;
  alertBox.className =
    "mb-4 rounded-xl p-3 " +
    (type === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-yellow-200 bg-yellow-50 text-yellow-900");
  alertBox.classList.remove("hidden");
}

function hideAlert() {
  alertBox.classList.add("hidden");
}

function validateStep(n) {
  // valida campos required deste passo
  const stepEl = steps.find((s) => Number(s.dataset.step) === n);
  const requiredFields = $$("[required]", stepEl);
  for (const field of requiredFields) {
    if (!field.value || (field.type === "select-one" && !field.value)) {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus();
      showAlert("Preencha os campos obrigatórios antes de continuar.");
      return false;
    }
    if (
      field.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)
    ) {
      field.focus();
      showAlert("Informe um e‑mail válido.", "error");
      return false;
    }
  }
  hideAlert();
  return true;
}

function buildReview() {
  const data = new FormData(form);
  // montar lista simples ignorando campos técnicos
  const ignore = new Set(["_gotcha", "_subject"]);
  const out = [];
  for (const [k, v] of data.entries()) {
    if (ignore.has(k) || v === "") continue;
    out.push(
      `<div class="flex justify-between gap-4"><span class="text-gray-600">${k}</span><span class="font-medium">${v}</span></div>`
    );
  }
  review.innerHTML = out.join("");
}

function saveDraft() {
  const data = Object.fromEntries(new FormData(form).entries());
  localStorage.setItem("wizardDraft", JSON.stringify(data));
  showAlert("Rascunho salvo neste navegador.");
  setTimeout(hideAlert, 2000);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem("wizardDraft");
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const [k, v] of Object.entries(data)) {
      const input = form.elements[k];
      if (!input) continue;
      if (input instanceof RadioNodeList) {
        // pode haver checkboxes com mesmo name
        const inputs = $$(`[name="${k}"]`, form);
        inputs.forEach((i) => {
          i.checked = Array.isArray(v)
            ? v.includes(i.value)
            : String(v) === i.value;
        });
      } else if (input.type === "checkbox") {
        input.checked = Boolean(v);
      } else {
        input.value = v;
      }
    }
  } catch (e) {
    console.warn("Sem rascunho");
  }
}

btnPrev.addEventListener("click", () => showStep(Math.max(1, current - 1)));
btnNext.addEventListener("click", () => {
  if (!validateStep(current)) return;
  showStep(Math.min(steps.length, current + 1));
});
btnSave.addEventListener("click", saveDraft);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  // honeypot
  const hp = form.querySelector('[name="_gotcha"]').value;
  if (hp) return; // provável bot

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    if (!USE_EMAILJS) {
      // Envio via Formspree
      const resp = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      if (!resp.ok) throw new Error("Falha no envio");
    } else {
      // Coloque aqui a chamada do EmailJS se optar por usar
      // emailjs.send(...)
    }

    localStorage.removeItem("wizardDraft");
    form.reset();
    showStep(1);
    showAlert("Enviado com sucesso! Em breve entrarei em contato.");
  } catch (err) {
    console.error(err);
    showAlert(
      "Não foi possível enviar agora. Tente novamente em instantes.",
      "error"
    );
  }
});

// Teclas: Enter = próximo (exceto textarea), Shift+Tab/Tab padrões
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag !== "textarea") {
      e.preventDefault();
      if (current < steps.length) btnNext.click();
    }
  }
});

// init
loadDraft();
showStep(1);
