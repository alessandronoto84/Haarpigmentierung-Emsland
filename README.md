# Haarpigmentierung Emsland – Website

Statische One-Page-Website (HTML/CSS/JS, kein Build nötig). Einfach `index.html` im Browser öffnen.

## Noch einzutragen
- Name, Adresse, Instagram-Handle: Platzhalter in eckigen Klammern `[...]`
- Fotos: siehe `assets/img/README.md`
- Impressum & Datenschutz vervollständigen

## Hosting (STRATO)
Domain: https://haarpigmentierung-emsland.de

Per FTP/SFTP oder STRATO-Datei-Manager ins Hauptverzeichnis der Domain hochladen:
`index.html`, `impressum.html`, `datenschutz.html`, `.htaccess`, `robots.txt`, `sitemap.xml` und den kompletten Ordner `assets/`.

Wichtig: Die `.htaccess` (leitet auf https um) erst hochladen, wenn SSL bei STRATO aktiviert ist.

## Chat-Assistent
`assets/chatbot.js` + `assets/chatbot.css` (läuft nur im Browser, keine Cookies, kein Server, speichert nichts), eingebunden auf allen Seiten, Deutsch und Englisch (folgt der Sprachwahl). Das Wissen steht in `assets/chatbot-wissen.js` und wird mit `python3 werkzeuge/chatbot-wissen.py` aus `index.html` und `assets/i18n.js` erzeugt, ergänzt um recherchiertes Allgemeinwissen (Quellen im Skript). Nach Textänderungen neu erzeugen. Den Ordner `werkzeuge/` nicht hochladen.
