#!/bin/bash
# Skript for å deaktivere skjermsparer og strømsparingsfunksjoner på Raspberry Pi

echo "Deaktiverer skjermsparer og energisparingsfunksjoner..."

# Deaktiver skjermsparer hvis X kjører
if command -v xset &> /dev/null; then
    echo "Konfigurerer X-server innstillinger..."
    xset s off      # Deaktiver skjermsparer
    xset -dpms      # Deaktiver DPMS (Display Power Management Signaling)
    xset s noblank  # Ikke blank skjermen
    echo "X-server innstillinger oppdatert"
fi

# Modifiser lightdm konfigurasjon for å deaktivere skjermsparer permanent
if [ -f /etc/lightdm/lightdm.conf ]; then
    echo "Oppdaterer LightDM konfigurasjon..."
    if ! grep -q "xserver-command=X -s 0 -dpms" /etc/lightdm/lightdm.conf; then
        sudo sed -i 's/^\[Seat:\*\]/[Seat:*]\nxserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
        echo "LightDM konfigurasjon oppdatert"
    else
        echo "LightDM er allerede konfigurert for å deaktivere skjermsparer"
    fi
fi

# Deaktiver blank skjerm i config.txt
if [ -f /boot/config.txt ]; then
    echo "Oppdaterer boot/config.txt..."
    if ! grep -q "^disable_overscan=1" /boot/config.txt; then
        sudo bash -c "echo 'disable_overscan=1' >> /boot/config.txt"
    fi
    if ! grep -q "^hdmi_force_hotplug=1" /boot/config.txt; then
        sudo bash -c "echo 'hdmi_force_hotplug=1' >> /boot/config.txt"
    fi
    if ! grep -q "^consoleblank=0" /boot/cmdline.txt; then
        sudo sed -i 's/$/ consoleblank=0/' /boot/cmdline.txt
    fi
    echo "Boot konfigurasjon oppdatert"
fi

# Deaktiver energisparingsfunksjoner
echo "Deaktiverer alle energisparingsfunksjoner..."
if [ -f /etc/xdg/lxsession/LXDE-pi/autostart ]; then
    # Sikre at autostart-mappen eksisterer
    mkdir -p ~/.config/lxsession/LXDE-pi/
    
    # Hvis filen ikke eksisterer, opprett den med riktige innstillinger
    if [ ! -f ~/.config/lxsession/LXDE-pi/autostart ]; then
        cp /etc/xdg/lxsession/LXDE-pi/autostart ~/.config/lxsession/LXDE-pi/
    fi
    
    # Legg til kommandoer for å deaktivere skjermsparer
    if ! grep -q "@xset s off" ~/.config/lxsession/LXDE-pi/autostart; then
        echo "@xset s off" >> ~/.config/lxsession/LXDE-pi/autostart
        echo "@xset -dpms" >> ~/.config/lxsession/LXDE-pi/autostart
        echo "@xset s noblank" >> ~/.config/lxsession/LXDE-pi/autostart
        echo "LXDE-pi autostart-fil oppdatert"
    else
        echo "LXDE-pi autostart er allerede konfigurert"
    fi
fi

echo "Alle skjermsparerfunksjoner er nå deaktivert"
echo "Du må kanskje starte systemet på nytt for at endringene skal tre i kraft"