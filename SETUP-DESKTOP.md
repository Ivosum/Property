# Property Network — Desktop-App (Tauri) — Einrichtung & Build

Diese Anleitung beschreibt, wie du aus dem bestehenden Property-Network-Code die
Desktop-App für **Windows** und **macOS** baust. Die Desktop-App verpackt exakt
dieselbe React-Oberfläche wie die Web-Version — es gibt nur eine Codebasis.

> **Wichtig:** Windows-Apps müssen unter Windows gebaut werden, Mac-Apps unter macOS.
> Es gibt kein sinnvolles Cross-Compiling für Tauri. Du brauchst also für jede
> Plattform einmal einen Rechner (oder einen CI-Runner wie GitHub Actions).

---

## 1. Voraussetzungen (einmalig pro Rechner)

### Alle Plattformen
- **Node.js** ≥ 20 — https://nodejs.org
- **Rust** (stabil) — https://rustup.rs
  - Nach der Installation Terminal neu öffnen und prüfen: `cargo --version`

### Zusätzlich unter Windows
- **Microsoft C++ Build Tools** — "Desktop development with C++"
  https://visualstudio.microsoft.com/visual-cpp-build-tools/
- **WebView2** ist auf Windows 10/11 in der Regel bereits vorhanden.
  Falls nicht: "Evergreen Bootstrapper" von Microsoft installieren.

### Zusätzlich unter macOS
- **Xcode Command Line Tools**: `xcode-select --install`

### Zusätzlich unter Linux (nur falls du auch eine Linux-Version willst)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## 2. Projekt vorbereiten

Im Projektordner (`property-network/`):

```bash
npm install
```

Lege eine `.env` an (aus `.env.example` kopieren) mit deinen Supabase-Werten:

```
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=DEIN_ANON_PUBLIC_KEY
```

Die Desktop-App verbindet sich mit demselben Supabase-Backend wie die Web-App.

---

## 3. Entwicklung — App live starten

```bash
npm run tauri:dev
```

Beim ersten Start kompiliert Rust die Tauri-Abhängigkeiten (einige Minuten,
danach gecacht). Anschließend öffnet sich ein natives Fenster mit der App.
Änderungen am React-Code werden live neu geladen (Hot Reload).

---

## 4. Produktion — installierbare App bauen

```bash
npm run tauri:build
```

Die fertigen Installer liegen danach unter:

```
src-tauri/target/release/bundle/
```

**Windows** erzeugt:
- `nsis/Property Network_0.1.0_x64-setup.exe`  (Installer)

**macOS** erzeugt:
- `dmg/Property Network_0.1.0_aarch64.dmg`  (Disk-Image zum Verteilen)
- `macos/Property Network.app`  (die App selbst)

---

## 5. Code-Signing (damit Windows/macOS nicht warnen)

Ohne Signierung zeigen beide Systeme eine Sicherheitswarnung. Für den echten
Vertrieb an Kunden brauchst du:

### macOS
- **Apple Developer Account** (99 USD/Jahr)
- Signieren + Notarisierung. In `src-tauri/tauri.conf.json` unter
  `bundle.macOS.signingIdentity` deine Developer-ID eintragen und die
  Notarisierungs-Credentials als Umgebungsvariablen setzen
  (`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).
- Doku: https://tauri.app/distribute/sign/macos/

### Windows
- Ein **Code-Signing-Zertifikat** (OV oder EV) von einer CA, **oder**
  **Azure Trusted Signing** (günstig, monatlich).
- Doku: https://tauri.app/distribute/sign/windows/

> Für erste interne Tests kannst du das Signing weglassen — die Warnung lässt
> sich manuell wegklicken ("Trotzdem ausführen").

---

## 6. Auto-Update (optional, später)

Tauri hat einen eingebauten Updater. Wenn du willst, dass Kunden automatisch
die neueste Version bekommen:

1. `tauri-plugin-updater` hinzufügen.
2. Ein Signing-Keypair erzeugen: `npm run tauri signer generate`.
3. In `tauri.conf.json` den `plugins.updater`-Block mit deiner Update-URL und
   dem Public Key eintragen.
4. Neue Versionen als Release (z. B. auf GitHub Releases oder deinem Server)
   bereitstellen; die App prüft beim Start.

Das ist bewusst noch **nicht** aktiviert — sinnvoll, sobald die erste Version steht.

---

## 7. Struktur (was neu dazugekommen ist)

```
property-network/
├── src/                      ← React-App (unverändert, Web + Desktop teilen sich das)
├── src-tauri/                ← NEU: die Desktop-Hülle
│   ├── tauri.conf.json       ← Fenster, Bundle, Icons, App-Name
│   ├── Cargo.toml            ← Rust-Abhängigkeiten (Tauri 2)
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json      ← Berechtigungen des Fensters
│   ├── icons/                ← aus deinem Logo generiert (ico/icns/png)
│   └── src/
│       ├── main.rs
│       └── lib.rs            ← gemeinsamer Einstieg (auch für spätere Mobile-App)
├── vite.config.ts            ← für Tauri angepasst (fester Port, Env-Präfixe)
└── package.json              ← neue Scripts: tauri:dev / tauri:build
```

---

## 8. Häufige Stolpersteine

- **"failed to run custom build command for `gdk-sys`"** (nur Linux): Die
  WebKit-Systempakete aus Schritt 1 fehlen.
- **Weißes Fenster beim Start**: `.env` fehlt oder Supabase-Werte falsch → die
  App lädt, kann sich aber nicht verbinden.
- **Port belegt**: Der Dev-Server läuft fest auf Port 8080. Ein anderer Prozess
  darauf muss beendet werden (`strictPort` verhindert stilles Ausweichen).
- **Langer erster Build**: Rust kompiliert beim ersten Mal alles; Folge-Builds
  sind dank Cache deutlich schneller.
