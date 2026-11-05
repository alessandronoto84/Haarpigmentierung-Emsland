// WhatsApp-Nummer (Ländercode ohne +, ohne führende 0)
const WHATSAPP_NUMBER = "491738072405";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Logo-Intro beim Öffnen ---------- */
(function intro() {
  if (reduceMotion) return;
  const el = document.createElement("div");
  el.className = "intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="intro-logo"><img src="assets/img/logo.png" alt=""><span class="intro-shine"></span></div><div class="intro-dots"><i></i><i></i><i></i><i></i></div>';
  document.body.appendChild(el);
  document.documentElement.classList.add("intro-on");
  const done = () => {
    if (!el.isConnected) return;
    el.classList.add("out");
    document.documentElement.classList.remove("intro-on");
    setTimeout(() => el.remove(), 700);
  };
  el.addEventListener("click", done);
  setTimeout(done, 1700);
})();

/* ---------- Mobiles Menü ---------- */
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  links.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));

/* ---------- Header-Schatten beim Scrollen ---------- */
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Sprachen ---------- */
const DE = {};
document.querySelectorAll("[data-i18n]").forEach(el => { DE[el.dataset.i18n] = el.innerHTML; });
DE._title = document.title;
DE.wa_intro = "Hallo, ich interessiere mich für eine Haarpigmentierung.";
DE.wa_name = "Name"; DE.wa_phone = "Telefon"; DE.wa_topic = "Thema";

let lang = "de";
function t(key) { return (lang !== "de" && window.I18N[lang] && window.I18N[lang][key]) || DE[key]; }

function setLang(l) {
  if (l !== "de" && !(window.I18N && window.I18N[l])) l = "de";
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.title = t("_title");
  document.querySelectorAll(".lang-switch button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === l));
  const url = new URL(window.location.href);
  if (l === "de") url.searchParams.delete("lang"); else url.searchParams.set("lang", l);
  try { history.replaceState(null, "", url); } catch (e) { /* z. B. lokale Datei */ }
}
document.querySelectorAll(".lang-switch button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
const startLang = new URLSearchParams(window.location.search).get("lang");
if (startLang) setLang(startLang);

/* ---------- Kontaktformular -> WhatsApp ---------- */
document.getElementById("contact-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const topic = e.target.querySelector("select").selectedOptions[0].textContent;
  const text =
    `${t("wa_intro")}\n\n${t("wa_name")}: ${f.get("name")}\n${t("wa_phone")}: ${f.get("phone")}\n${t("wa_topic")}: ${topic}` +
    (f.get("message") ? `\n\n${f.get("message")}` : "");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});

/* ---------- Einblenden beim Scrollen ---------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reduceMotion) {
  // Elemente einer Gruppe nacheinander einblenden
  document.querySelectorAll(".cards, .steps, .stat-grid, .gallery, .feature-list").forEach(group => {
    group.querySelectorAll(".reveal").forEach((el, i) => el.style.setProperty("--d", `${i * 90}ms`));
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add("in"));
}

/* ---------- Pigmentpunkte im Hintergrund des Titelbereichs ---------- */
(function heroDots() {
  const canvas = document.querySelector(".hero-dots");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  let w, h, dots = [], dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 2600);
    dots = Array.from({ length: count }, () => newDot(true));
  }
  function newDot(randomAge) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.4,
      life: 4000 + Math.random() * 6000,
      age: randomAge ? Math.random() * 8000 : 0,
      blue: Math.random() < 0.25
    };
  }
  function draw(dt) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.age += dt;
      if (d.age > d.life) { dots[i] = newDot(false); continue; }
      const p = d.age / d.life;
      const a = Math.sin(p * Math.PI) * (d.blue ? 0.55 : 0.28);
      ctx.fillStyle = d.blue ? `rgba(0,157,226,${a})` : `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) { draw(0); return; }
  let last = performance.now(), visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  (function loop(now) {
    const dt = Math.min(now - last, 50); last = now;
    if (visible && !document.hidden) draw(dt);
    requestAnimationFrame(loop);
  })(last);
})();
