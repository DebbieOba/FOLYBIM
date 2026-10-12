(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- MOBILE MENU ----------
  const menuToggle = document.getElementById("menuToggle");
  const navMenu    = document.getElementById("navMenu");

  if (menuToggle && navMenu) {
    const setMenu = (open) => {
      navMenu.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
    navMenu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });
  }

  // ---------- HERO SLIDESHOW ----------
  const slides   = document.querySelectorAll(".hero-slide");
  const captions = document.querySelectorAll(".hero-caption");

  if (slides.length > 1 && !reduceMotion) {
    let current = 0;
    setInterval(() => {
      slides[current].classList.remove("active");
      captions[current].classList.remove("active");
      captions[current].setAttribute("aria-hidden", "true");
      current = (current + 1) % slides.length;
      slides[current].classList.add("active");
      captions[current].classList.add("active");
      captions[current].removeAttribute("aria-hidden");
    }, 6000);
  }

  // ---------- SCROLL REVEAL ----------
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach((el) => observer.observe(el));
  }

  // ---------- FOOTER YEAR ----------
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ==========================================================
  // ---------- CONTACT FORM — VALIDATION & SANITIZATION ------
  // ==========================================================
  // Nothing typed into the form is trusted. Every value is cleaned, then
  // checked against a strict rule, and only the cleaned values are sent.
  // Visitors' input is only ever written back to the page with
  // .value / .textContent, never innerHTML, so it can't run as code.
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("formStatus");
  const submitBtn = form.querySelector('button[type="submit"]');
  const loadedAt = Date.now();

  // Take over from the browser's built-in bubbles so our messages are shown.
  // (Without JavaScript the HTML required/maxlength rules still apply.)
  form.noValidate = true;

  // --- Sanitization ---

  // Zero-width and text-direction characters can hide or disguise text
  const INVISIBLE = /[​-‏‪-‮⁠-⁩﻿]/g;

  /**
   * Turn any input into safe plain text:
   * - normalise look-alike Unicode characters (NFKC)
   * - remove control and invisible characters (newlines kept only if multiline)
   * - remove HTML tags and any leftover < > characters
   * - remove "javascript:" URIs
   * - tidy whitespace
   * Apostrophes and quotes are kept so names like O'Neil and normal
   * sentences survive; they are harmless in plain text.
   */
  function sanitize(raw, multiline) {
    if (typeof raw !== "string") return "";
    let s = raw.normalize("NFKC").replace(/\r\n?/g, "\n").replace(INVISIBLE, "");
    s = multiline
      ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "")
      : s.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
    s = s
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .replace(/javascript\s*:/gi, "");
    s = multiline
      ? s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n")
      : s.replace(/\s+/g, " ");
    return s.trim();
  }

  // --- Validation rules (applied to the sanitized value) ---
  const allowedServices = Array.from(form.elements.service.options, (o) => o.value);

  const RULES = {
    name: {
      label: "Full name",
      required: true,
      min: 2,
      max: 80,
      // letters from any language (incl. Yoruba/Igbo marks), spaces, ' . -
      pattern: /^\p{L}[\p{L}\p{M} '.-]*$/u,
      hint: "Please use letters, spaces, apostrophes, hyphens or full stops only.",
    },
    company: {
      label: "Company",
      max: 100,
      pattern: /^[\p{L}\p{M}\p{N} &.,'()\/-]*$/u,
      hint: "Please use letters, numbers and basic punctuation only.",
    },
    email: {
      label: "Email address",
      required: true,
      max: 254,
      pattern: /^[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/,
      hint: "Please enter a valid email address, e.g. name@company.com.",
    },
    phone: {
      label: "Phone number",
      max: 20,
      pattern: /^\+?[\d\s()-]+$/,
      check: (v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      },
      hint: "Please enter a valid phone number, e.g. 0803 123 4567 or +234 803 123 4567.",
    },
    service: {
      label: "Service",
      // compared exactly as received: must be one of the dropdown's own
      // options, so a tampered value is rejected instead of cleaned
      exact: true,
      check: (v) => allowedServices.includes(v),
      hint: "Please choose a service from the list.",
    },
    message: {
      label: "Project details",
      required: true,
      multiline: true,
      min: 20,
      max: 2000,
      // more than 3 links is almost always spam
      check: (v) => (v.match(/https?:\/\/|www\./gi) || []).length <= 3,
      hint: "Please include no more than 3 links.",
    },
  };

  /** Returns { ok, value, error } for one field. */
  function validateField(name) {
    const rule = RULES[name];
    const raw = form.elements[name].value;
    if (rule.exact) {
      return rule.check(raw)
        ? { ok: true, value: raw, error: "" }
        : { ok: false, value: "", error: rule.hint };
    }
    const value = sanitize(raw, rule.multiline);

    if (!value) {
      return rule.required
        ? { ok: false, value, error: `${rule.label} is required.` }
        : { ok: true, value, error: "" };
    }
    if (rule.min && value.length < rule.min) {
      return { ok: false, value, error: `${rule.label} must be at least ${rule.min} characters.` };
    }
    if (rule.max && value.length > rule.max) {
      return { ok: false, value, error: `${rule.label} must be ${rule.max} characters or fewer.` };
    }
    if ((rule.pattern && !rule.pattern.test(value)) || (rule.check && !rule.check(value))) {
      return { ok: false, value, error: rule.hint };
    }
    return { ok: true, value, error: "" };
  }

  // --- Inline error messages ---
  function getErrorEl(field) {
    const id = field.id + "-error";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      el.className = "field-error";
      field.closest(".field").appendChild(el);
      const described = field.getAttribute("aria-describedby");
      field.setAttribute("aria-describedby", described ? described + " " + id : id);
    }
    return el;
  }

  function showError(field, msg) {
    getErrorEl(field).textContent = msg;
    field.classList.add("invalid");
    field.setAttribute("aria-invalid", "true");
  }

  function clearError(field) {
    getErrorEl(field).textContent = "";
    field.classList.remove("invalid");
    field.removeAttribute("aria-invalid");
  }

  function checkField(name) {
    const field = form.elements[name];
    const result = validateField(name);
    if (result.ok) clearError(field);
    else showError(field, result.error);
    return result;
  }

  Object.keys(RULES).forEach((name) => {
    const field = form.elements[name];
    const isSelect = field.tagName === "SELECT";
    // Check when the visitor leaves a field, and show them the cleaned
    // version of what they typed so what they see is what gets sent
    field.addEventListener(isSelect ? "change" : "blur", () => {
      const { value } = checkField(name);
      if (!isSelect && field.value !== value) field.value = value;
    });
    // Re-check while typing once a field has been marked wrong
    field.addEventListener("input", () => {
      if (field.classList.contains("invalid")) checkField(name);
    });
  });

  // Live character count for the message
  const counter = document.getElementById("message-count");
  const updateCounter = () => {
    if (counter) counter.textContent = `${form.elements.message.value.length} / ${RULES.message.max} characters`;
  };
  form.elements.message.addEventListener("input", updateCounter);

  // --- Submit ---
  let lastSubmit = 0;
  const COOLDOWN_MS = 30000;

  function showStatus(type, text) {
    statusEl.className = "form-status" + (type ? " " + type : "");
    statusEl.textContent = text;
  }

  function resetForm() {
    form.reset();
    Object.keys(RULES).forEach((name) => clearError(form.elements[name]));
    updateCounter();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Bots fill the hidden honeypot field or submit instantly: pretend it
    // worked so they learn nothing, but send nothing.
    const honeypot = form.elements._gotcha;
    if ((honeypot && honeypot.value) || Date.now() - loadedAt < 3000) {
      resetForm();
      showStatus("success", "Thank you. Your message has been sent.");
      return;
    }

    if (Date.now() - lastSubmit < COOLDOWN_MS) {
      showStatus("error", "Your message has already been sent. Please wait a moment before sending another.");
      return;
    }

    // Validate everything and build the payload from sanitized values only
    const data = new FormData();
    let firstInvalid = null;
    let errors = 0;

    for (const name of Object.keys(RULES)) {
      const result = checkField(name);
      if (result.ok) {
        data.append(name, result.value);
      } else {
        errors++;
        firstInvalid = firstInvalid || form.elements[name];
      }
    }

    if (errors) {
      showStatus("error", errors === 1
        ? "Please correct the highlighted field before sending."
        : `Please correct the ${errors} highlighted fields before sending.`);
      firstInvalid.focus();
      return;
    }

    data.append("_subject", "New website enquiry from " + data.get("name"));

    submitBtn.disabled = true;
    showStatus("", "Sending your message…");

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Server returned " + res.status);

      lastSubmit = Date.now();
      resetForm();
      showStatus("success", "Thank you. Your message has been sent and we will get back to you shortly.");
    } catch (err) {
      showStatus("error", "Sorry, your message could not be sent right now. Please call or email us directly.");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
