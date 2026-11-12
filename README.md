# Fachmaturaarbeiten 2026

Öffentliche Broschüre mit 28 Präsentationen, Bildern, Abstracts und moderierten Kommentaren. Schüler*innen geben ihre Initialen an. Die Initialen sind eine Selbstangabe. Die Lehrperson sieht neue Beiträge unter /lehrer, wo sie diese veröffentlicht oder löscht. Freigegebene Beiträge erscheinen unter dem passenden Abstract.

## Lokal starten

Voraussetzung ist Node.js 24.

    npm ci
    node spelling/build.mjs
    TEACHER_PASSWORD=DEIN_LOKALES_PASSWORT node server.mjs

Öffne http://127.0.0.1:8080. Der Benutzername im Lehrerbereich lautet lehrer. Die SQLite-Datei wird im Startverzeichnis angelegt.

## Öffentlich betreiben

Stelle dieses Projekt auf einem Node.js-Host mit HTTPS und persistentem Dateispeicher bereit. Setze PORT und FMA_HOST entsprechend der Hosting-Umgebung. FMA_DB legt den Pfad auf dem persistenten Datenträger fest. Hinterlege TEACHER_PASSWORD als Secret. Für die öffentliche Instanz ist ein Passwort mit mindestens 16 Zeichen erforderlich. GitHub kann Quellcode und Assets verwalten. GitHub Pages führt den Node.js-Server und SQLite nicht aus.

Für die Bereitstellung werden server.mjs und site/ benötigt. Die früheren lokalen Entschlüsselungsdateien im Ordner auswertung/ gehören nicht zur Anwendung. Auch die Klassenliste und die SQLite-Datei bleiben ausserhalb des Repositorys.
