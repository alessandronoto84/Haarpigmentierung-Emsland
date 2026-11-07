# Wissensbasis für den Chat-Assistenten (assets/chatbot.js) erzeugen.
# Aufruf im Repo-Ordner:  python3 werkzeuge/chatbot-wissen.py
# Schreibt assets/chatbot-wissen.js mit Deutsch (aus index.html) und Englisch (aus assets/i18n.js).
#
# Quellen:
#  1) Alles, was auf der Webseite steht (Texte über die data-i18n-Schlüssel).
#  2) Ergänzend allgemeines Wissen aus seriösen Quellen (beim Bau recherchiert, 07.11.2026),
#     als feste Antworten unten in ALLGEMEIN. Jede Antwort nennt ihre Quelle im Kommentar.
#     Keine Preise, Termine oder Garantien, die nicht auf der Seite stehen. Widerspricht etwas
#     der Seite, gilt die Seite (z. B. Nachsorge: Text der Seite wird übernommen).
#  Der Ordner werkzeuge/ wird nicht auf den Webspace hochgeladen.
import html, json, os, re

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lies(name):
    return open(os.path.join(WURZEL, name), encoding='utf-8').read()


def txt(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    return re.sub(r'\s+([.,:;!?])', r'\1', s)


idx = lies('index.html')
# Deutsch: Inhalt jedes Elements mit data-i18n="schluessel"
DE = {}
for tag, key, inner in re.findall(r'<(\w+)[^>]*\bdata-i18n="([a-z0-9_]+)"[^>]*>(.*?)</\1>', idx, re.S):
    DE.setdefault(key, txt(inner))
# Englisch: aus assets/i18n.js (Block en: { … })
i18n = lies('assets/i18n.js')
en_block = i18n[i18n.find('en: {'):i18n.find('tr: {')]
EN = {k: txt(v.encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8') if '\\u' in v else v)
      for k, v in re.findall(r'^\s*([a-z0-9_]+):\s*"((?:[^"\\]|\\.)*)"', en_block, re.M)}
for k in list(DE):
    EN.setdefault(k, None)

tel = re.search(r'href="tel:([^"]+)"[^>]*>([^<]+)</a>', idx)
mail = re.search(r'href="mailto:([^"]+)"', idx).group(1)
wa = re.search(r'href="(https://wa\.me/\d+)"', idx).group(1)
insta = re.search(r'href="(https://www\.instagram\.com/[^"]+)"', idx).group(1)
studio = txt(re.search(r'<li><strong[^>]*>Studio:</strong>(.*?)</li>', idx, re.S).group(1)) if re.search(r'<li><strong[^>]*>Studio:</strong>(.*?)</li>', idx, re.S) else 'Burgstraße 12, 49808 Lingen (Ems)'


def T(L, k):
    v = (DE if L == 'de' else EN).get(k) or DE.get(k, '')
    return v


def liste(z):
    return '\n'.join(f'- {x}' for x in z if x)


def bau(L):
    de = L == 'de'
    faq = []

    def F(id, q, a, k, links=None, nxt=None, prio=False):
        e = {'id': id, 'q': q, 'a': a, 'k': k}
        if links: e['links'] = links
        if nxt: e['next'] = nxt
        if prio: e['prio'] = True
        faq.append(e)

    kontakt_links = [{'t': 'WhatsApp', 'h': wa}, {'t': 'Anrufen' if de else 'Call', 'h': f'tel:{tel.group(1)}'},
                     {'t': 'E-Mail', 'h': f'mailto:{mail}'}, {'t': 'Kontakt' if de else 'Contact', 'h': '#kontakt'}]
    S = {  # Vorschläge
        'was': 'Was ist eine Haarpigmentierung?' if de else 'What is scalp micropigmentation?',
        'preis': 'Was kostet das?' if de else 'How much does it cost?',
        'weh': 'Tut das weh?' if de else 'Does it hurt?',
        'ablauf': 'Wie läuft das ab?' if de else 'How does it work?',
        'pflege': 'Was muss ich danach beachten?' if de else 'What about aftercare?',
        'kontakt': 'Kontakt' if de else 'Contact',
        'risiken': 'Gibt es Risiken?' if de else 'Are there risks?',
    }
    NOTE = ('\nIm Zweifel bitte ärztlich abklären lassen.' if de else '\nIf in doubt, please have it checked by a doctor.')

    # ---------- Inhalte der Seite ----------
    F('was', S['was'],
      f"{T(L, 'hero_title')}\n{T(L, 'hero_lead')}\n{T(L, 'm_intro')}",
      ['haarpigmentierung', 'pigmentierung', 'smp', 'scalp', 'micropigmentation', 'mikropigmentierung', 'was ist', 'what is', 'methode', 'method', 'funktioniert', 'works', 'haare', 'hair'],
      [{'t': 'Methode' if de else 'Method', 'h': '#methode'}], [S['ablauf'], S['preis'], S['weh']])
    F('fuerwen', 'Für wen?' if de else 'Who is it for?',
      T(L, 'who_title') + '\n' + liste(f"{T(L, f'c{i}_t')}: {T(L, f'c{i}_p')}" for i in range(1, 7)),
      ['für wen', 'who', 'geeignet', 'suitable', 'richtige', 'right', 'kandidat', 'candidate'],
      [{'t': 'Für wen?' if de else 'Who is it for?', 'h': '#fuer-wen'}], [S['was'], S['kontakt']])
    for i, kw in zip(range(1, 7), [
        ['licht', 'lichtes', 'dünn', 'dünnes', 'thinning', 'thin', 'kopfhaut', 'scalp', 'schimmert'],
        ['glatze', 'bald', 'geheimratsecken', 'receding', 'haarlinie', 'hairline', 'kahl'],
        ['haartransplantation', 'transplantation', 'transplant', 'grafts', 'spender', 'donor', 'fue'],
        ['narbe', 'narben', 'scar', 'scars', 'fut', 'unfall', 'kaschieren', 'cover'],
        ['frau', 'frauen', 'women', 'scheitel', 'parting', 'female'],
        ['bart', 'beard', 'barthaar', 'lücken', 'gaps']]):
        F(f'c{i}', T(L, f'c{i}_t'), T(L, f'c{i}_p'), kw + [T(L, f'c{i}_t')], None, [S['preis'], S['ablauf'], S['kontakt']])
    F('vergleich', T(L, 'v_title'),
      T(L, 'v_intro') + '\n' + liste(f"{T(L, f'v_r{i}')}: {T(L, 'v_h_ht')}: {T(L, f'v_t{i}')} | {T(L, 'v_h_smp')}: {T(L, f'v_p{i}')}" for i in range(1, 6)),
      ['haartransplantation', 'transplantation', 'transplant', 'vergleich', 'compare', 'unterschied', 'difference', 'statt op', 'operation', 'surgery', 'besser', 'better', 'alternative'],
      [{'t': T(L, 'nav_alt'), 'h': '#alternative'}], [S['preis'], S['ablauf']])
    F('methode', T(L, 'm_title'),
      T(L, 'm_intro') + '\n' + liste(T(L, f'm_f{i}') for i in range(1, 5)) + '\n' +
      ', '.join(x for x in [f"{T(L, 's1_v')} {T(L, 's1_l')}", f"{T(L, 's2_v')} {T(L, 's2_l')}", T(L, 's3_l'), f"{T(L, 's4_v')} {T(L, 's4_l')}"] if x.strip()),
      ['4d', 'technik', 'technique', 'farbtöne', 'colours', 'colors', 'punkte', 'dots', 'sitzungen', 'sessions', 'sitzung', 'session', 'dauer', 'stunden', 'hours', 'wie lange dauert', 'how long'],
      [{'t': 'Methode' if de else 'Method', 'h': '#methode'}], [S['ablauf'], S['weh']])
    F('ablauf', S['ablauf'],
      T(L, 'p_title') + '\n' + liste(f"{T(L, f'p{i}_t')}: {T(L, f'p{i}_p')}" for i in range(1, 5)),
      ['ablauf', 'process', 'schritte', 'steps', 'beratung', 'consultation', 'erstberatung', 'farbtest', 'test', 'termin', 'appointment', 'nachsorge', 'aftercare', 'wie läuft'],
      [{'t': 'Ablauf' if de else 'Process', 'h': '#ablauf'}], [S['preis'], S['pflege'], S['kontakt']])
    F('ueber', T(L, 'a_title'), f"{T(L, 'a_p1')}\n{T(L, 'a_p2')}\n{T(L, 'a_studio')}",
      ['wer', 'who are you', 'alessandro', 'noto', 'über', 'about', 'erfahrung', 'experience', 'gelernt', 'trained', 'foundation time', 'haarpigmentierer', 'ausbildung', 'training'],
      None, [S['kontakt']])
    faq_kw = {
        1: ['weh', 'schmerz', 'schmerzen', 'schmerzhaft', 'hurt', 'pain', 'painful', 'spürt', 'betäubung', 'anesthesia'],
        2: ['hält', 'haltbar', 'haltbarkeit', 'last', 'lasts', 'permanent', 'dauerhaft', 'verblassen', 'fade', 'fading', 'auffrischung', 'touch up', 'jahre', 'years'],
        3: ['tattoo', 'tätowierung', 'aussehen', 'look', 'natürlich', 'natural', 'blaustich', 'blue', 'verlaufen', 'pigmente', 'pigments', 'vegan'],
        4: ['beachten', 'nach der behandlung', 'nachsorge', 'aftercare', 'pflege', 'care', 'sport', 'sauna', 'schwimmen', 'swimming', 'sonne', 'sun', 'eincremen', 'duschen', 'shower', 'waschen', 'wash'],
        5: ['kosten', 'kostet', 'preis', 'preise', 'cost', 'price', 'prices', 'euro', 'teuer', 'expensive', 'angebot', 'quote'],
        6: ['länger', 'longer', 'lange haare', 'long hair', 'tragen', 'wear', 'rasiert', 'shaved', 'frisur'],
    }
    zusatz = {
        # Quelle: ro.co/hair-loss/scalp-micropigmentation (Chimene Richa, MD; stützt sich auf Rassman et al. 2015,
        # J Clin Aesthet Dermatol): Pigment hellt mit der Zeit auf, Auffrischungen können nötig sein;
        # in den ersten 30 Tagen direkte Sonne meiden bzw. Kopfbedeckung/Sonnenschutz LSF 30+.
        2: ('\nAllgemein gilt: Sonne lässt Pigmente schneller aufhellen. Eine Kopfbedeckung oder Sonnenschutz hilft, das Ergebnis länger zu erhalten.'
            if de else '\nIn general, sun exposure makes pigment fade faster. A hat or sunscreen helps the result last longer.'),
        4: ('\nAllgemein empfohlen: die behandelte Stelle in den ersten Tagen nicht kratzen oder daran reiben und auch danach die Kopfhaut vor starker Sonne schützen (Kopfbedeckung oder Sonnenschutz). Die genauen Pflegehinweise bekommst du nach der Sitzung.'
            if de else '\nGenerally recommended: do not scratch or rub the treated area in the first days, and protect your scalp from strong sun afterwards (hat or sunscreen). You will get exact aftercare instructions after your session.'),
    }
    for i in range(1, 7):
        F(f'f{i}', T(L, f'f{i}_q'), T(L, f'f{i}_a') + zusatz.get(i, ''), faq_kw[i],
          [{'t': 'FAQ', 'h': '#faq'}] + ([{'t': 'Kostenlose Beratung' if de else 'Free consultation', 'h': '#kontakt'}] if i == 5 else []),
          [S['ablauf'], S['kontakt']] if i != 4 else [S['risiken'], S['kontakt']])
    F('kontakt', S['kontakt'],
      f"{T(L, 'k_title')}\n{T(L, 'k_intro')}\n{T(L, 'k_phone')} {tel.group(2)}\nWhatsApp: {wa.replace('https://', '')}\n{T(L, 'k_mail')} {mail}\nStudio: {studio}\nInstagram: @{insta.rstrip('/').rsplit('/', 1)[-1]}",
      ['kontakt', 'contact', 'telefon', 'phone', 'anrufen', 'call', 'whatsapp', 'email', 'e mail', 'mail', 'adresse', 'address', 'wo', 'where', 'lingen', 'emsland', 'studio', 'anfragen', 'termin', 'appointment', 'beratung', 'consultation', 'instagram', 'erreichen', 'reach'],
      kontakt_links + [{'t': 'Instagram', 'h': insta}], [S['preis'], S['ablauf']])
    F('recht', 'Impressum & Datenschutz' if de else 'Legal notice & privacy',
      ('Alle Pflichtangaben stehen im Impressum, Informationen zum Umgang mit Daten in der Datenschutzerklärung. Inhaber: Alessandro Noto.'
       if de else 'All legal details are in the legal notice (Impressum), information on data processing in the privacy policy (both in German). Owner: Alessandro Noto.'),
      ['impressum', 'datenschutz', 'privacy', 'legal', 'inhaber', 'owner', 'dsgvo', 'gdpr'],
      [{'t': 'Impressum', 'h': 'impressum.html'}, {'t': 'Datenschutz' if de else 'Privacy', 'h': 'datenschutz.html'}])

    # ---------- Allgemeines Wissen (recherchiert) ----------
    # Quelle: ro.co/hair-loss/scalp-micropigmentation (ärztlich verfasst/geprüft; Rassman et al. 2015, JCAD):
    # SMP ist eine Form der kosmetischen Tätowierung, kaschiert dünnes Haar optisch, behandelt aber nicht die
    # Ursache des Haarausfalls. Risiken: Infektion bei verunreinigten Nadeln/Farben, allergische Reaktionen auf
    # Pigmentbestandteile, schlechtes Ergebnis (zu tief gesetzt = fleckig/verlaufen). Bei entzündeter Kopfhaut
    # (Akne, Ekzem, Schuppenflechte) nicht empfohlen. Pigmente können Metalle enthalten (MRT).
    F('risiken', S['risiken'],
      ('Eine Haarpigmentierung ist ein kosmetischer Eingriff, bei dem Pigment in die Haut gesetzt wird. Allgemein bekannte Risiken sind:\n'
       '- Infektionen, wenn nicht hygienisch mit sterilen Nadeln und einwandfreien Pigmenten gearbeitet wird\n'
       '- allergische Reaktionen auf Bestandteile der Pigmente (selten)\n'
       '- ein unschönes Ergebnis, etwa wenn Pigment zu tief gesetzt wird und verläuft\n'
       'Darum sind ein sauber arbeitendes Studio und der Farbtest vor der Pigmentierung wichtig (siehe Ablauf).'
       if de else
       'Scalp micropigmentation is a cosmetic procedure that places pigment in the skin. Generally known risks are:\n'
       '- infection if needles and pigments are not sterile and hygiene is poor\n'
       '- allergic reactions to pigment ingredients (rare)\n'
       '- a poor result, e.g. pigment placed too deep that spreads\n'
       'That is why a clean studio and the colour test before the pigmentation matter (see the process).'),
      ['risiko', 'risiken', 'risk', 'risks', 'gefährlich', 'dangerous', 'nebenwirkung', 'nebenwirkungen', 'side effects', 'sicher', 'safe', 'komplikation', 'complication', 'gesundheit', 'health', 'schädlich', 'harmful'],
      None, [S['pflege'], S['kontakt']])
    F('ursache', 'Hilft das gegen Haarausfall?' if de else 'Does it stop hair loss?',
      ('Eine Haarpigmentierung lässt lichtes Haar und kahle Stellen voller wirken, sie behandelt aber nicht die Ursache des Haarausfalls und lässt keine Haare wachsen. Die Ursache klärt am besten eine Hautärztin oder ein Hautarzt. Die Pigmentierung lässt sich laut Seite jederzeit nachverdichten und anpassen.'
       if de else
       'Scalp micropigmentation makes thinning hair and bald areas look fuller, but it does not treat the cause of hair loss and does not make hair grow. A dermatologist is the right person to find the cause. According to the site, the pigmentation can be topped up and adjusted at any time.'),
      ['haarausfall', 'hair loss', 'ursache', 'cause', 'wachsen', 'grow', 'wachstum', 'growth', 'stoppen', 'stop', 'heilen', 'cure', 'medikament', 'medication', 'minoxidil', 'finasterid', 'finasteride', 'alopezie', 'alopecia', 'kreisrunder'],
      None, [S['was'], S['kontakt']])
    F('haut', 'Geht das bei Hautproblemen?' if de else 'What about skin conditions?',
      ('Bei entzündeter Kopfhaut, zum Beispiel durch Akne, Ekzeme oder Schuppenflechte, wird eine Pigmentierung allgemein nicht empfohlen, solange die Entzündung besteht. Sprich das bitte in der kostenlosen Erstberatung an.'
       if de else
       'With an inflamed scalp, e.g. from acne, eczema or psoriasis, pigmentation is generally not recommended while the inflammation is active. Please mention it in the free consultation.') + NOTE,
      ['schuppenflechte', 'psoriasis', 'ekzem', 'eczema', 'neurodermitis', 'akne', 'acne', 'hautkrankheit', 'skin condition', 'kopfhaut entzündet', 'inflamed', 'empfindliche haut', 'sensitive skin', 'keloid', 'wulstnarben'],
      [{'t': 'Erstberatung' if de else 'Consultation', 'h': '#kontakt'}], [S['risiken'], S['kontakt']])
    F('mrt', 'MRT nach Pigmentierung?' if de else 'MRI after pigmentation?',
      ('Pigmente können Spuren von Metallen enthalten. Wenn bei dir ein MRT ansteht, gib der Praxis vorher kurz Bescheid, dass du eine Pigmentierung der Kopfhaut hast.'
       if de else 'Pigments may contain traces of metals. If you are due for an MRI, let the practice know beforehand that you have scalp pigmentation.'),
      ['mrt', 'mri', 'kernspin', 'röntgen', 'x ray', 'metall', 'metal'], None, [S['risiken']])
    # Quelle: NHS (nhs.uk/conditions/infected-piercings, gilt allgemein für Hautverletzungen) und ro.co:
    # Anzeichen einer Infektion: Schwellung, Schmerz, Wärme, starke Rötung, Eiter, Fieber/Krankheitsgefühl.
    # Leichte Reizung direkt nach der Behandlung ist üblich.
    F('beschwerden', 'Rötung, Schwellung, Entzündung' if de else 'Redness, swelling, infection',
      ('Eine leichte Rötung und Empfindlichkeit direkt nach der Sitzung sind üblich und klingen meist rasch ab. Anzeichen für eine Entzündung oder Infektion sind dagegen zunehmende Schwellung, Schmerzen, Wärme, starke Rötung, Eiter oder Fieber und Krankheitsgefühl. Auch Juckreiz, Ausschlag oder Schwellung als mögliche allergische Reaktion gehören dazu. Melde dich in diesen Fällen auch bei Alessandro.'
       if de else
       'Slight redness and tenderness right after a session are common and usually settle quickly. Signs of inflammation or infection are increasing swelling, pain, warmth, strong redness, pus, or fever and feeling unwell. Itching, a rash or swelling as a possible allergic reaction also count. In these cases please also let Alessandro know.') + NOTE,
      ['entzündung', 'entzündet', 'infection', 'infected', 'eiter', 'pus', 'rötung', 'gerötet', 'rot', 'redness', 'red', 'schwellung', 'geschwollen', 'swelling', 'swollen', 'allergie', 'allergisch', 'allergy', 'allergic', 'juckt', 'jucken', 'juckreiz', 'itch', 'itching', 'ausschlag', 'rash', 'fieber', 'fever', 'starke schmerzen', 'severe pain', 'blutet', 'bleeding', 'krusten', 'scabs'],
      kontakt_links[:2], [S['pflege'], S['kontakt']], prio=True)

    F('bot', 'Wer bist du?' if de else 'Who are you?',
      ('Ich bin ein automatischer Assistent. Ich laufe nur in deinem Browser, nutze keine Cookies und speichere oder versende deine Eingaben nicht. Ich antworte mit den Informationen dieser Webseite und allgemeinem Wissen, ersetze aber keine persönliche oder ärztliche Beratung.'
       if de else 'I am an automated assistant. I run only in your browser, use no cookies and do not store or send what you type. I answer with information from this website and general knowledge, but I do not replace personal or medical advice.'),
      ['wer bist du', 'who are you', 'bot', 'chatbot', 'assistent', 'assistant', 'ki', 'ai', 'mensch', 'human', 'gespeichert', 'stored', 'cookies'])
    F('danke', 'Danke' if de else 'Thanks', 'Gern! Frag einfach weiter.' if de else 'You are welcome! Feel free to ask more.',
      ['danke', 'dankeschön', 'thanks', 'thank', 'super', 'great', 'tschüss', 'bye'])

    return {
        'titel': 'Haarpigmentierung · Assistent' if de else 'Scalp pigmentation · Assistant',
        'begruessung': ('Hallo! Ich bin der automatische Assistent von Haarpigmentierung Emsland. Frag mich zu Methode, Ablauf, Kosten, Nachsorge oder Kontakt.'
                        if de else 'Hi! I am the automated assistant of Haarpigmentierung Emsland. Ask me about the method, process, cost, aftercare or contact.'),
        'vorschlaege': [S['was'], S['preis'], S['weh'], S['ablauf'], S['kontakt']],
        'fallback': {
            'a': (f'Dazu habe ich leider keine Antwort. Frag Alessandro am besten direkt, per WhatsApp, Telefon ({tel.group(2)}) oder E-Mail ({mail}). Die Erstberatung ist kostenlos.'
                  if de else f'Sorry, I have no answer to that. Best ask Alessandro directly via WhatsApp, phone ({tel.group(2)}) or email ({mail}). The first consultation is free.'),
            'links': kontakt_links,
            'next': [S['was'], S['preis'], S['kontakt']],
        },
        'faq': faq,
    }


kb = {'sprachen': {'de': bau('de'), 'en': bau('en')}}
ziel = os.path.join(WURZEL, 'assets', 'chatbot-wissen.js')
with open(ziel, 'w', encoding='utf-8') as fh:
    fh.write('/* Automatisch erzeugt von werkzeuge/chatbot-wissen.py (Seiteninhalte + recherchiertes Allgemeinwissen mit Quellen im Skript). Nicht von Hand ändern. */\n')
    fh.write('window.ChatbotWissen=' + json.dumps(kb, ensure_ascii=False, separators=(',', ':')) + ';\n')
fehlt = [k for k in DE if not EN.get(k)]
print('chatbot-wissen.js:', len(kb['sprachen']['de']['faq']), 'Einträge je Sprache,', os.path.getsize(ziel), 'Bytes; ohne EN-Text:', fehlt)
