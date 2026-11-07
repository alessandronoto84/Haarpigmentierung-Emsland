/*!
 * Chat-Assistent (FAQ-/Wissensbot), rein im Browser.
 * Keine externen Dienste, keine Cookies, kein Speichern von Eingaben.
 * Wissen: chatbot-wissen.js (setzt window.ChatbotWissen), wird beim ersten Öffnen geladen.
 * Einbinden: <script src="chatbot.js" defer></script>  (optional data-kb="…", data-css="…")
 */
(function () {
  'use strict';
  if (window.__chatbotGeladen) return;
  window.__chatbotGeladen = true;

  var me = document.currentScript;
  var src = (me && me.src) || '';
  var BASE = src ? src.replace(/[^\/]*([?#].*)?$/, '') : '';
  var VER = (src.match(/[?&]v=([^&#]+)/) || [])[1] || '';
  function rel(p) { return BASE + p + (VER ? '?v=' + VER : ''); }
  var KB_URL = (me && me.getAttribute('data-kb')) || rel('chatbot-wissen.js');
  var CSS_URL = (me && me.getAttribute('data-css')) || rel('chatbot.css');
  var LABEL_ATTR = me && me.getAttribute('data-label');

  /* Oberflächentexte je Sprache (Sprache aus <html lang>) */
  var UI = {
    de: { launch: 'Fragen?', open: 'Fragen an den Assistenten stellen', title: 'Assistent', note: 'Automatischer Assistent, keine Beratung. Eingaben werden nicht gespeichert.', close: 'Assistent schließen', log: 'Unterhaltung', sugs: 'Vorschläge', label: 'Deine Frage', ph: 'Frage eingeben …', send: 'Frage senden', you: 'Du: ', bot: 'Assistent: ', down: 'Der Assistent ist gerade nicht verfügbar. Bitte nutze die Kontaktangaben auf dieser Seite.', fmt: 'Formate: ', inKat: 'Das habe ich in „%s“ gefunden:', katN: '„%s“: %n Titel', katMore: ', hier eine Auswahl. Alle siehst du im Gesamtkatalog.', one: 'Dazu habe ich dieses Buch gefunden:', many: 'Dazu habe ich diese Bücher gefunden:', loose: 'Vielleicht passt eines davon:' },
    es: { launch: '¿Preguntas?', open: 'Hacer una pregunta al asistente', title: 'Asistente', note: 'Asistente automático, sin asesoramiento. No se guarda nada de lo que escribes.', close: 'Cerrar asistente', log: 'Conversación', sugs: 'Sugerencias', label: 'Tu pregunta', ph: 'Escribe una pregunta …', send: 'Enviar pregunta', you: 'Tú: ', bot: 'Asistente: ', down: 'El asistente no está disponible ahora. Usa los datos de contacto de esta página.', fmt: 'Formatos: ', inKat: 'Esto he encontrado en «%s»:', katN: '«%s»: %n títulos', katMore: ', aquí una selección.', one: 'He encontrado este libro:', many: 'He encontrado estos libros:', loose: 'Quizá te sirva uno de estos:' },
    en: { launch: 'Questions?', open: 'Ask the assistant a question', title: 'Assistant', note: 'Automated assistant, not advice. Nothing you type is stored.', close: 'Close assistant', log: 'Conversation', sugs: 'Suggestions', label: 'Your question', ph: 'Type a question …', send: 'Send question', you: 'You: ', bot: 'Assistant: ', down: 'The assistant is not available right now. Please use the contact details on this page.', fmt: 'Formats: ', inKat: 'Here is what I found in “%s”:', katN: '“%s”: %n titles', katMore: ', here is a selection. The full list is on the page.', one: 'I found this book:', many: 'I found these books:', loose: 'Maybe one of these fits:' }
  };
  function curLang() { return (document.documentElement.getAttribute('lang') || 'de').slice(0, 2).toLowerCase(); }
  var LANG = curLang(), L = UI[LANG] || UI.de;

  var KB = null, root, panel, log, input, launch, sugBox, loading = false;

  /* ---------- Text-Normalisierung und Abgleich ---------- */
  var STOP = ('a ab aber alle allem allen aller alles als also am an ans auch auf aus bei beim bin bis bist da dadurch daher damit dann das dass dein deine dem den der des dessen di die dies diese diesem diesen dieser dieses dir doch dort du durch ein eine einem einen einer eines er es etwa euch euer eure fuer gibt gib gab hab habe haben hat hatte hier ich ihr ihre im in ins ist ja jetzt kann kannst koennen koennte man mehr mein meine mich mir mit muss nach nicht noch nun nur ob oder ohne sein seine sich sie sind so soll sollte sowie ueber um und uns unser unsere vom von vor war was welche welchem welchen welcher welches wenn wer werde werden wie wieviel wir wird wo womit wo zu zum zur bitte gerne gern mal denn eigentlich hallo hi hey moin danke infos info sagen erzaehl erzaehle zeig zeige zeigen suche suchen ich moechte moechten will wollen wuerde wuerden brauche es gibt the an of to in on for is are was be do does did can could would should will what which who whom how where when why there here this that these those it its you your yours me my i we our us they them their he she his her have has had any some please hello hi hey thanks thank tell show about with from at by as or and if not no yes get got want need like el la los las un una unos unas del al y o en que son por para con sin como cual cuales hay mi te tu su sus se lo le les yo puedo puede hola gracias quiero necesito ser estar esta este esto eso muy mas').split(' ');
  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = 1; });

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9€]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function toks(s, keepStop) {
    return norm(s).split(' ').filter(function (w) { return w && (keepStop || (!STOPSET[w] && w.length > 1)); });
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  /* Ähnlichkeit zweier Wörter: 1 = gleich, 0 = nichts */
  function sim(q, w) {
    if (q === w) return 1;
    var lq = q.length, lw = w.length;
    if (lq >= 4 && lw >= 4 && (w.indexOf(q) === 0 || q.indexOf(w) === 0)) return 0.8;
    if (lq >= 5 && lw > lq && w.indexOf(q) > 0) return 0.6;
    if (lq >= 5 && lw >= 5) {
      var max = Math.min(lq, lw) >= 8 ? 2 : 1;
      if (lev(q, w, max) <= max) return 0.7;
    }
    return 0;
  }
  function bestSim(q, list) {
    var b = 0;
    for (var i = 0; i < list.length && b < 1; i++) { var s = sim(q, list[i]); if (s > b) b = s; }
    return b;
  }

  /* ---------- Wissen vorbereiten ---------- */
  function prep() {
    (KB.faq || []).forEach(function (f) {
      f._kw = [];
      f._phr = [];
      (f.k || []).forEach(function (k) {
        var n = norm(k);
        if (n.indexOf(' ') > 0) f._phr.push(n);
        toks(k).forEach(function (t) { f._kw.push(t); });
      });
      f._qt = toks(f.q);
    });
    (KB.buecher || []).forEach(function (b) {
      b._t = toks(b.t);
      b._tn = norm(b.t);
      b._a = toks(b.a);
      b._an = norm(b.a);
      b._g = toks((b.g || '') + ' ' + (b.c || '') + ' ' + (b.r || '') + ' ' + (b.s || []).join(' '));
      b._s = toks(b.sub || '');
      b._d = toks(b.d || '');
    });
  }

  function scoreFaq(qt, qn) {
    var res = [];
    (KB.faq || []).forEach(function (f) {
      var s = 0, hit = 0;
      qt.forEach(function (t) {
        var k = bestSim(t, f._kw), q = bestSim(t, f._qt) * 0.6;
        var v = Math.max(k, q);
        if (v > 0) { hit++; s += v * (k >= q ? 3 : 2); }
      });
      f._phr.forEach(function (p) { if ((' ' + qn + ' ').indexOf(' ' + p + ' ') > -1) s += 3; });
      if (s > 0) res.push({ f: f, s: s });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    return res;
  }

  var GENERIC = { buch: 1, buecher: 1, buches: 1, titel: 1, autor: 1, autorin: 1, autoren: 1, verlag: 1, lesen: 1, empfehlung: 1, empfehlen: 1, empfiehlst: 1, thema: 1, themen: 1, ueber: 1 };
  function scoreBooks(qt, qn) {
    var words = qt.filter(function (t) { return !GENERIC[t]; });
    var res = [];
    if (!words.length) return res;
    (KB.buecher || []).forEach(function (b) {
      var s = 0, strong = false;
      if (b._tn.length >= 4 && (' ' + qn + ' ').indexOf(' ' + b._tn + ' ') > -1) { s += 8; strong = true; }
      if (b._an && (' ' + qn + ' ').indexOf(' ' + b._an + ' ') > -1) { s += 6; strong = true; }
      words.forEach(function (t) {
        var a = bestSim(t, b._t) * 4, c = bestSim(t, b._a) * 4, g = bestSim(t, b._g) * 3;
        var sb = bestSim(t, b._s) * 2.5, d = (b._d.indexOf(t) > -1 ? 1.2 : 0);
        var m = Math.max(a, c, g, sb, d);
        if (a >= 2.8 || c >= 2.8) strong = true;
        s += m;
      });
      if (s > 0) res.push({ b: b, s: s, strong: strong });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    return res;
  }

  /* ---------- Darstellung ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function href(h) {
    if (/^(https?:|mailto:|tel:|#|\/)/.test(h)) return h;
    if (KB && KB.relativZu === 'seite') return h; /* relativ zur aktuellen Seite */
    return BASE + h;
  }
  function linkEl(l, cls) {
    var a = el('a', cls || 'cb-link', l.t);
    a.href = href(l.h);
    if (/^https?:/.test(l.h) && l.h.indexOf(location.host) === -1) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  function paras(box, text) {
    String(text || '').split(/\n+/).forEach(function (p) {
      if (!p.trim()) return;
      if (/^[-•] /.test(p)) {
        var ul = box.lastChild && box.lastChild.tagName === 'UL' ? box.lastChild : box.appendChild(el('ul', 'cb-list'));
        ul.appendChild(el('li', null, p.replace(/^[-•] /, '')));
      } else box.appendChild(el('p', null, p));
    });
  }
  function scrollEnd() { log.scrollTop = log.scrollHeight; }
  /* Lange Antworten von oben lesbar machen: zum Anfang der neuen Antwort scrollen */
  function scrollTo(m) {
    var top = m.offsetTop - 10;
    log.scrollTop = Math.min(top, log.scrollHeight);
  }

  function addUser(text) {
    var m = el('div', 'cb-msg cb-user');
    m.appendChild(el('span', 'cb-sr', L.you));
    m.appendChild(document.createTextNode(text));
    log.appendChild(m);
    scrollEnd();
  }
  function botBox() {
    var m = el('div', 'cb-msg cb-bot');
    m.appendChild(el('span', 'cb-sr', L.bot));
    log.appendChild(m);
    return m;
  }
  function addAnswer(a) {
    var m = botBox();
    paras(m, a.a);
    if (a.b && KB && KB.buecher) {
      a.b.forEach(function (u) {
        for (var i = 0; i < KB.buecher.length; i++) if (KB.buecher[i].u === u) { m.appendChild(bookCard(KB.buecher[i])); break; }
      });
    }
    if (a.links && a.links.length) {
      var lb = el('div', 'cb-links');
      a.links.forEach(function (l) { lb.appendChild(linkEl(l)); });
      m.appendChild(lb);
    }
    setSuggestions(a.next);
    scrollTo(m);
  }
  function bookCard(b) {
    var c = el('div', 'cb-book');
    var h = el('p', 'cb-book-t');
    if (b.u) h.appendChild(linkEl({ t: b.t, h: b.u }, 'cb-book-link')); else h.textContent = b.t;
    c.appendChild(h);
    c.appendChild(el('p', 'cb-book-m', [b.a, b.g || b.c].filter(Boolean).join(' · ')));
    if (b.d) c.appendChild(el('p', 'cb-book-d', b.d.length > 150 ? b.d.slice(0, 147).replace(/\s+\S*$/, '') + ' …' : b.d));
    if (b.f && b.f.length) c.appendChild(el('p', 'cb-book-f', L.fmt + b.f.join(', ')));
    return c;
  }
  function addBooks(list, intro) {
    var m = botBox();
    paras(m, intro);
    list.forEach(function (b) { m.appendChild(bookCard(b)); });
    if (KB.katalog) {
      var lb = el('div', 'cb-links');
      lb.appendChild(linkEl(KB.katalog));
      m.appendChild(lb);
    }
    setSuggestions(KB.nachBuch || KB.vorschlaege);
    scrollTo(m);
  }
  function setSuggestions(list) {
    sugBox.textContent = '';
    (list || KB.vorschlaege || []).forEach(function (s) {
      var b = el('button', 'cb-sug', s);
      b.type = 'button';
      b.addEventListener('click', function () { ask(s); });
      sugBox.appendChild(b);
    });
  }

  /* ---------- Antwortlogik ---------- */
  function answer(text) {
    var qn = norm(text), qt = toks(text);
    if (!qt.length) qt = toks(text, true);
    var faqs = scoreFaq(qt, qn), books = KB.buecher ? scoreBooks(qt, qn) : [];
    var fTop = faqs[0] ? faqs[0].s : 0, bTop = books[0] ? books[0].s : 0;

    // Vorrang-Einträge (z. B. Hinweis bei Gesundheitsfragen) gehen allem anderen vor
    for (var p = 0; p < faqs.length; p++) if (faqs[p].f.prio && faqs[p].s >= 2.4) return addAnswer(faqs[p].f);

    // Kategorie-Wunsch (z. B. "Welche Reiseführer gibt es?")
    if (KB.kategorien) {
      for (var key in KB.kategorien) {
        if (!KB.kategorien.hasOwnProperty(key)) continue;
        var kat = KB.kategorien[key];
        if (qt.some(function (t) { return (kat.k || []).some(function (k) { return sim(t, k) >= 0.8; }); })) {
          var inKat = KB.buecher.filter(function (b) { return b.c === kat.c; });
          var titleHit = books.length && books[0].strong && books[0].b.c !== kat.c;
          if (inKat.length && !titleHit) {
            var narrowed = books.filter(function (r) { return r.b.c === kat.c && r.strong; }).map(function (r) { return r.b; });
            if (narrowed.length) return addBooks(narrowed.slice(0, 6), L.inKat.replace('%s', kat.c));
            var show = inKat.slice(0, 6);
            return addBooks(show, L.katN.replace('%s', kat.c).replace('%n', inKat.length) + (inKat.length > show.length ? L.katMore : '.'));
          }
        }
      }
    }

    if (books.length && books[0].strong && bTop >= Math.max(3, fTop * 0.9)) {
      var top = books.filter(function (r) { return r.strong && r.s >= bTop * 0.6; }).slice(0, 6).map(function (r) { return r.b; });
      return addBooks(top, top.length === 1 ? L.one : L.many);
    }
    if (fTop >= 2.4) return addAnswer(faqs[0].f);
    if (books.length && bTop >= 2.4) {
      var loose = books.filter(function (r) { return r.s >= bTop * 0.7; }).slice(0, 5).map(function (r) { return r.b; });
      return addBooks(loose, L.loose);
    }
    addAnswer(KB.fallback);
  }

  function ask(text) {
    text = String(text || '').trim();
    if (!text) return;
    addUser(text.slice(0, 300));
    if (!KB) return;
    answer(text.slice(0, 300));
  }

  /* ---------- Aufbau und Bedienung ---------- */
  function build() {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = CSS_URL;
    document.head.appendChild(css);

    root = el('div', 'cb');
    root.setAttribute('data-chatbot', '');

    launch = el('button', 'cb-launch');
    launch.type = 'button';
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'cb-panel');

    launch.innerHTML = '<svg class="cb-ic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 8.5h7M8.5 11.5h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="cb-launch-t"></span>';

    panel = el('div', 'cb-panel');
    panel.id = 'cb-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'cb-title');

    var head = el('div', 'cb-head');
    var ht = el('div', 'cb-head-t');
    var h = el('h2', 'cb-title');
    h.id = 'cb-title';
    ht.appendChild(h);
    var note = el('p', 'cb-note');
    note.id = 'cb-note';
    ht.appendChild(note);
    head.appendChild(ht);
    var close = el('button', 'cb-close');
    close.type = 'button';
    close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    head.appendChild(close);
    panel.appendChild(head);

    log = el('div', 'cb-log');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.tabIndex = 0;
    panel.appendChild(log);

    sugBox = el('div', 'cb-sugs');
    sugBox.setAttribute('role', 'group');
    panel.appendChild(sugBox);

    var form = el('form', 'cb-form');
    form.setAttribute('autocomplete', 'off');
    var lab = el('label', 'cb-sr');
    lab.htmlFor = 'cb-input';
    input = el('input', 'cb-input');
    input.id = 'cb-input';
    input.type = 'text';
    input.maxLength = 300;
    input.setAttribute('aria-describedby', 'cb-note');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('enterkeyhint', 'send');
    var send = el('button', 'cb-send');
    send.type = 'submit';
    send.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    form.appendChild(lab);
    form.appendChild(input);
    form.appendChild(send);
    panel.appendChild(form);

    root.appendChild(panel);
    root.appendChild(launch);
    document.body.appendChild(root);
    applyUI();

    launch.addEventListener('click', function () { panel.hidden ? open() : shut(); });
    close.addEventListener('click', function () { shut(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = '';
      ask(v);
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); shut(); }
    });
  }

  function applyUI() {
    LANG = curLang();
    L = UI[LANG] || UI.de;
    root.setAttribute('lang', UI[LANG] ? LANG : 'de');
    root.setAttribute('dir', 'ltr');
    launch.setAttribute('aria-label', L.open);
    launch.querySelector('.cb-launch-t').textContent = (LANG === 'de' && LABEL_ATTR) || L.launch;
    panel.querySelector('.cb-title').textContent = L.title;
    panel.querySelector('.cb-note').textContent = L.note;
    panel.querySelector('.cb-close').setAttribute('aria-label', L.close);
    log.setAttribute('aria-label', L.log);
    sugBox.setAttribute('aria-label', L.sugs);
    panel.querySelector('label.cb-sr').textContent = L.label;
    input.placeholder = L.ph;
    panel.querySelector('.cb-send').setAttribute('aria-label', L.send);
  }
  /* Wissen wählen: {sprachen:{de:…,en:…}} oder ein einzelnes Wissen */
  function pickKB() {
    var W = window.ChatbotWissen;
    if (!W) return null;
    var k = W.sprachen ? (W.sprachen[LANG] || W.sprachen.de || W.sprachen[Object.keys(W.sprachen)[0]]) : W;
    if (k && !k._prep) { KB = k; prep(); k._prep = true; }
    return k;
  }
  function loadKB(cb) {
    if (window.ChatbotWissen) { KB = pickKB(); return cb(); }
    if (loading) return;
    loading = true;
    var s = document.createElement('script');
    s.src = KB_URL;
    s.async = true;
    s.onload = function () {
      loading = false;
      if (window.ChatbotWissen) KB = pickKB();
      cb();
    };
    s.onerror = function () { loading = false; cb(); };
    document.head.appendChild(s);
  }

  function greet() {
    if (log.childNodes.length) return;
    if (!KB) {
      var m = botBox();
      paras(m, L.down);
      return;
    }
    document.getElementById('cb-title').textContent = KB.titel || L.title;
    addAnswer({ a: KB.begruessung, next: KB.vorschlaege });
  }

  function open() {
    if (curLang() !== LANG) { applyUI(); log.textContent = ''; sugBox.textContent = ''; KB = null; }
    panel.hidden = false;
    root.classList.add('cb-open');
    launch.setAttribute('aria-expanded', 'true');
    loadKB(function () { greet(); input.focus(); });
    input.focus();
  }
  function shut() {
    panel.hidden = true;
    root.classList.remove('cb-open');
    launch.setAttribute('aria-expanded', 'false');
    launch.focus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
