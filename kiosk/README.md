# Kiosk-modus for Bilsjåfør Registrering

Dette er en kiosk-modus løsning for bilsjåfør-registreringsapplikasjonen designet for å kjøre på en Raspberry Pi tilkoblet en TV-skjerm.

## Oversikt

Kiosk-modus-oppsettet gjør at du kan kjøre applikasjonen i fullskjermmodus på en dedikert skjerm, samtidig som samme Raspberry Pi fungerer som server for andre enheter som ønsker å få tilgang til systemet via nettverket.

## Forutsetninger

- Raspberry Pi (anbefalt modell 3B+ eller nyere)
- Raspbian OS (Raspberry Pi OS) installert
- Skjerm tilkoblet via HDMI
- Nettverkstilkobling (WiFi eller Ethernet)

## Mappestruktur

```
kiosk/
├── autostart/                  # Autostart-konfigurasjon
│   ├── kiosk.service           # Systemd service-fil
│   └── bilregistrering-kiosk.desktop  # Desktop autostart-fil
├── scripts/                    # Hjelpeskript
│   ├── disable-screensaver.sh  # Deaktiverer skjermsparer
│   └── update-kiosk.sh         # Oppdaterer installasjonen
├── start-kiosk.sh              # Hovedskript for Linux/Raspberry Pi
├── start-kiosk.bat             # Versjon for Windows (for testing)
└── README.md                   # Denne filen
```

## Installasjon på Raspberry Pi

### Forberedelse

1. Sørg for at din Raspberry Pi er oppdatert:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. Installer nødvendige pakker:
   ```bash
   sudo apt install -y chromium-browser nodejs npm git
   ```

3. Klon prosjektet (hvis du ikke allerede har gjort det):
   ```bash
   git clone https://github.com/din-bruker/bilsjafor-registrering.git
   cd bilsjafor-registrering
   ```

### Konfigurering

1. Gjør start-skriptet kjørbart:
   ```bash
   chmod +x kiosk/start-kiosk.sh
   chmod +x kiosk/scripts/*.sh
   ```

2. Oppdater skriptene med riktig bane hvis prosjektet ikke er i hjemmemappen:
   - Rediger `kiosk/start-kiosk.sh` 
   - Oppdater `PROJECT_DIR` hvis nødvendig
   - Oppdater service-filen med riktig bane:
     ```bash
     nano kiosk/autostart/kiosk.service
     ```

3. Deaktiver skjermsparer og energisparingsfunksjoner:
   ```bash
   ./kiosk/scripts/disable-screensaver.sh
   ```

### Manuell start

For å starte kiosk-modus manuelt:

```bash
./kiosk/start-kiosk.sh
```

Dette vil:
1. Starte Node.js-serveren
2. Åpne Chromium i fullskjermmodus med applikasjonen

### Automatisk oppstart ved boot

Du har to alternativer for å sette opp autostart:

#### Alternativ 1: Bruk start-skriptet (anbefalt)

Kjør start-skriptet og svar "j" når det spør om du vil sette opp autostart:

```bash
./kiosk/start-kiosk.sh
```

#### Alternativ 2: Manuell installasjon

1. Kopier systemd service-filen:
   ```bash
   sudo cp kiosk/autostart/kiosk.service /etc/systemd/system/
   sudo systemctl enable kiosk.service
   ```

2. Eller, for desktop-miljøer:
   ```bash
   mkdir -p ~/.config/autostart
   cp kiosk/autostart/bilregistrering-kiosk.desktop ~/.config/autostart/
   ```

## Tilpasning av kiosk-modus

Du kan tilpasse kiosk-oppsettet ved å redigere disse filene:

- `start-kiosk.sh`: Endre `SERVER_HOST` til IP-adressen din for å tillate tilgang fra andre enheter.
- `autostart/kiosk.service`: Oppdater stier og brukernavn.

## Konfigurere wifi fra kommandolinjen

Hvis du trenger å koble Raspberry Pi til WiFi uten skrivebord:

```bash
sudo raspi-config
```

Gå til "System Options" > "Wireless LAN" og følg instruksjonene.

## Feilsøking

### Nettleseren viser ikke applikasjonen

1. Sjekk at serveren kjører:
   ```bash
   ps aux | grep node
   ```

2. Sjekk at nettverksporten er åpen:
   ```bash
   sudo netstat -tulpn | grep 5000
   ```

3. Sjekk nettleser-loggene:
   ```bash
   ls -la ~/.config/chromium/chrome_debug.log
   ```

### Skjermen går i dvale

Kjør skriptet for å deaktivere skjermsparer igjen:

```bash
./kiosk/scripts/disable-screensaver.sh
```

### Avslutte kiosk-modus

For å avslutte kiosk-modus:

1. Trykk `Alt+F4` for å lukke nettleseren
2. Eller trykk `Ctrl+Alt+T` for å åpne terminal, deretter:
   ```bash
   pkill -f chromium
   ```

## Oppdatering av applikasjonen

For å oppdatere applikasjonen:

```bash
./kiosk/scripts/update-kiosk.sh
```

Dette vil:
1. Lage sikkerhetskopi av lokale endringer
2. Hente oppdateringer fra Git
3. Installere nye avhengigheter
4. Bygge applikasjonen på nytt
5. Starte kiosk-modus på nytt

## Sikkerhet

- Brannmur: Hvis du vil begrense tilgangen til applikasjonen, kan du konfigurere UFW:
  ```bash
  sudo apt install ufw
  sudo ufw allow 22/tcp     # SSH
  sudo ufw allow 5000/tcp   # Applikasjonsserver
  sudo ufw enable
  ```

- Beskytte mot uautorisert tilgang:
  Hvis kiosken er i et offentlig område, vurder å deaktivere tastaturet når den er i kiosk-modus:
  ```bash
  xinput disable $(xinput list | grep -i keyboard | grep -o 'id=[0-9]*' | sed 's/id=//')
  ```