// >>> Hier deine WhatsApp-Nummer eintragen (Ländercode ohne +, ohne führende 0), z. B. "4915112345678"
const WHATSAPP_NUMBER = "49XXXXXXXXXXX";

document.getElementById("year").textContent = new Date().getFullYear();

// Mobiles Menü
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

// Kontaktformular -> WhatsApp-Nachricht
document.getElementById("contact-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const text =
    `Hallo, ich interessiere mich für eine Haarpigmentierung.\n\n` +
    `Name: ${f.get("name")}\nTelefon: ${f.get("phone")}\nThema: ${f.get("topic")}` +
    (f.get("message") ? `\n\n${f.get("message")}` : "");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});
