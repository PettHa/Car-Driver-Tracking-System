#!/bin/bash
# Skript for å oppdatere bilregistrering-kiosk fra GitHub

# Farger for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Ingen farge

# Prosjektmappe
PROJECT_DIR="$(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")"

echo -e "${GREEN}Bilregistrering Kiosk Oppdateringsskript${NC}"
echo -e "${YELLOW}Prosjektmappe: ${PROJECT_DIR}${NC}"

# Sjekk om git er installert
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git er ikke installert. Installerer...${NC}"
    sudo apt-get update
    sudo apt-get install -y git
fi

# Gå til prosjektmappen
cd "$PROJECT_DIR" || {
    echo -e "${RED}Kunne ikke gå til prosjektmappen: $PROJECT_DIR${NC}"
    exit 1
}

# Sikkerhetskopi av lokale endringer
echo -e "${YELLOW}Lager sikkerhetskopi av lokale endringer...${NC}"
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_dir="${PROJECT_DIR}_backup_${timestamp}"
mkdir -p "$backup_dir"

# Kopier lokale konfigurasjonsfiler som kan ha blitt endret
cp -r "$PROJECT_DIR/kiosk" "$backup_dir/"
cp "$PROJECT_DIR/.env" "$backup_dir/" 2>/dev/null || true
echo -e "${GREEN}Sikkerhetskopi laget i: $backup_dir${NC}"

# Oppdater fra git
echo -e "${YELLOW}Henter oppdateringer fra git...${NC}"

# Sjekk om dette er et git-repository
if [ -d .git ]; then
    # Lagre eventuelle lokale endringer
    git stash
    
    # Sjekk om det er oppdateringer
    git fetch
    HEADHASH=$(git rev-parse HEAD)
    UPSTREAMHASH=$(git rev-parse @{u})
    
    if [ "$HEADHASH" != "$UPSTREAMHASH" ]; then
        echo -e "${GREEN}Nye oppdateringer er tilgjengelige. Oppdaterer...${NC}"
        git pull
        
        # Gjenopprett lokale endringer om mulig
        git stash pop 2>/dev/null || true
    else
        echo -e "${GREEN}Ingen nye oppdateringer tilgjengelig.${NC}"
        # Gjenopprett lokale endringer
        git stash pop 2>/dev/null || true
    fi
else
    echo -e "${RED}Dette er ikke et git-repository. Kan ikke oppdatere.${NC}"
    exit 1
fi

# Installer nye avhengigheter
echo -e "${YELLOW}Oppdaterer avhengigheter...${NC}"
npm install

# Bygg klient-koden på nytt
echo -e "${YELLOW}Bygger klient-koden på nytt...${NC}"
npm run build-client

# Sjekk om kiosk-prosessene kjører, og restart om nødvendig
if pgrep -f "chromium.*kiosk" > /dev/null || pgrep -f "chrome.*kiosk" > /dev/null; then
    echo -e "${YELLOW}Kiosk-nettleser kjører. Restarter...${NC}"
    pkill -f "chromium.*kiosk" || pkill -f "chrome.*kiosk"
    sleep 2
    
    # Start kiosk på nytt
    "$PROJECT_DIR/kiosk/start-kiosk.sh" &
fi

echo -e "${GREEN}Oppdatering fullført!${NC}"