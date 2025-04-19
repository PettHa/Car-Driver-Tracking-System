#!/bin/bash

# Konfigurasjon
SERVER_PORT=5000
SERVER_HOST="localhost"  # Endre til IP-adressen din i lokal nettverk for remote tilgang
WEB_URL="http://$SERVER_HOST:$SERVER_PORT/view?tv=true"
PROJECT_DIR="$(dirname "$(dirname "$(readlink -f "$0")")")"  # Prosjektets rotmappe

# Farger for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Ingen farge

# Print banner
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║              Bilregistrering Kiosk                 ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Sjekk om vi kjører på Raspberry Pi
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "raspbian" ]]; then
        IS_RASPBERRY_PI=true
        echo -e "${YELLOW}Kjører på Raspberry Pi${NC}"
    fi
fi

# Funksjon for å deaktivere skjermsparer og strømstyring
disable_screensaver() {
    if [ "$IS_RASPBERRY_PI" = true ]; then
        echo -e "${YELLOW}Deaktiverer skjermsparer og skjermdimming...${NC}"
        
        # Deaktiver skjermsparer
        xset s off
        xset -dpms
        xset s noblank
        
        # Forhindre at Raspberry Pi går i dvale
        if [ -f /etc/lightdm/lightdm.conf ]; then
            if ! grep -q "xserver-command=X -s 0 -dpms" /etc/lightdm/lightdm.conf; then
                sudo sed -i 's/^\[Seat:\*\]/[Seat:*]\nxserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
                echo -e "${GREEN}Lightdm konfigurert for å deaktivere DPMS/skjermsparer${NC}"
            fi
        fi
        
        echo -e "${GREEN}Skjermsparer deaktivert${NC}"
    fi
}

# Funksjon for å starte Node.js-serveren
start_server() {
    echo -e "${YELLOW}Starter server...${NC}"
    
    # Gå til prosjektmappen
    cd "$PROJECT_DIR"
    echo -e "${YELLOW}Prosjektmappe: $PROJECT_DIR${NC}"
    
    # Sjekk om serveren allerede kjører
    if pgrep -f "node.*server.js" > /dev/null; then
        echo -e "${YELLOW}Serveren kjører allerede.${NC}"
    else
        # Start serveren i bakgrunnen
        npm start &
        SERVER_PID=$!
        echo -e "${GREEN}Server startet med PID: $SERVER_PID${NC}"
        
        # Vent til serveren er klar
        echo -e "${YELLOW}Venter på at serveren skal bli klar...${NC}"
        sleep 10
    fi
}

# Funksjon for å starte nettleseren i kiosk-modus
start_browser() {
    echo -e "${YELLOW}Starter nettleser i kiosk-modus...${NC}"
    
    # Sjekk om vi er på Raspberry Pi
    if [ "$IS_RASPBERRY_PI" = true ]; then
        # Bruk Chromium på Raspberry Pi
        if command -v chromium-browser &> /dev/null; then
            echo -e "${GREEN}Starter Chromium-nettleser...${NC}"
            chromium-browser --noerrdialogs --disable-infobars --kiosk --incognito "$WEB_URL" &
        elif command -v chromium &> /dev/null; then
            echo -e "${GREEN}Starter Chromium-nettleser...${NC}"
            chromium --noerrdialogs --disable-infobars --kiosk --incognito "$WEB_URL" &
        else
            echo -e "${RED}Chromium-nettleser ikke funnet.${NC}"
            exit 1
        fi
    else
        # Prøv forskjellige nettlesere basert på hva som er tilgjengelig
        if command -v google-chrome &> /dev/null; then
            echo -e "${GREEN}Starter Google Chrome...${NC}"
            google-chrome --noerrdialogs --disable-infobars --kiosk --incognito "$WEB_URL" &
        elif command -v chromium &> /dev/null; then
            echo -e "${GREEN}Starter Chromium-nettleser...${NC}"
            chromium --noerrdialogs --disable-infobars --kiosk --incognito "$WEB_URL" &
        elif command -v firefox &> /dev/null; then
            echo -e "${GREEN}Starter Firefox...${NC}"
            firefox --kiosk "$WEB_URL" &
        else
            echo -e "${RED}Ingen støttet nettleser funnet.${NC}"
            exit 1
        fi
    fi
    
    BROWSER_PID=$!
    echo -e "${GREEN}Nettleser startet med PID: $BROWSER_PID${NC}"
}

# Funksjon for å aktivere autostart ved oppstart (for Raspberry Pi eller systemer med systemd)
setup_autostart() {
    if [ "$IS_RASPBERRY_PI" = true ] || command -v systemctl &> /dev/null; then
        echo -e "${YELLOW}Setter opp autostart...${NC}"
        
        # Lag service-fil
        SERVICE_FILE="/etc/systemd/system/bilregister-kiosk.service"
        SCRIPT_PATH="$(readlink -f "$0")"
        
        echo -e "${YELLOW}Lager service-fil i $SERVICE_FILE...${NC}"
        
        sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=Bilsjafor Registrering Kiosk
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$(whoami)
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$(whoami)/.Xauthority
ExecStart=$SCRIPT_PATH
WorkingDirectory=$(dirname "$SCRIPT_PATH")
Restart=on-failure
RestartSec=10

[Install]
WantedBy=graphical.target
EOF
        
        # Sett tillatelser
        sudo chmod 644 $SERVICE_FILE
        
        # Aktiver og start tjenesten
        sudo systemctl enable bilregister-kiosk.service
        echo -e "${GREEN}Autostart-tjeneste opprettet og aktivert.${NC}"
        echo -e "${GREEN}Systemet vil nå starte kiosk-modus ved oppstart.${NC}"
        
        # For Raspberry Pi - legg til autostart i rc.local også som backup
        if [ "$IS_RASPBERRY_PI" = true ]; then
            # Sjekk om den allerede er lagt til
            if ! grep -q "$SCRIPT_PATH" /etc/rc.local; then
                echo -e "${YELLOW}Legger til oppstart i /etc/rc.local som backup...${NC}"
                sudo sed -i "s|^exit 0|# Start Bilsjafor Kiosk\nsu $(whoami) -c \"$SCRIPT_PATH\" &\n\nexit 0|" /etc/rc.local
                echo -e "${GREEN}Lagt til i rc.local${NC}"
            fi
        fi
        
    else
        echo -e "${YELLOW}Autostart-oppsett er ikke støttet på dette systemet.${NC}"
        echo -e "${YELLOW}Du må legge til dette skriptet manuelt i oppstartsprogrammene dine.${NC}"
    fi
}

# Funksjon for å håndtere nettverkstilkobling
ensure_network() {
    echo -e "${YELLOW}Sjekker nettverkstilkobling...${NC}"
    
    # Vent på at nettverket skal være tilgjengelig
    for i in {1..30}; do
        if ping -c 1 -W 1 8.8.8.8 &>/dev/null; then
            echo -e "${GREEN}Nettverket er tilgjengelig.${NC}"
            return 0
        fi
        echo -e "${YELLOW}Venter på nettverkstilkobling... ($i/30)${NC}"
        sleep 1
    done
    
    echo -e "${RED}Kunne ikke koble til nettverket etter 30 forsøk.${NC}"
    echo -e "${YELLOW}Fortsetter likevel siden serveren kjører lokalt...${NC}"
    return 1
}

# Hovedutførelse
if [ "$IS_RASPBERRY_PI" = true ]; then
    disable_screensaver
fi

ensure_network
start_server
start_browser

# Spør om brukeren vil sette opp autostart
if [ ! -f "/etc/systemd/system/bilregister-kiosk.service" ]; then
    read -p "Vil du sette opp autostart ved oppstart? (j/n): " SETUP_AUTOSTART
    if [[ $SETUP_AUTOSTART =~ ^[Jj]$ ]]; then
        setup_autostart
    fi
fi

echo -e "${GREEN}Kiosk-modus startet. For å avslutte, trykk Alt+F4 eller lukk nettleseren.${NC}"

# Hold skriptet kjørende for å opprettholde prosessene
wait