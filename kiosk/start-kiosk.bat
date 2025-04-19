@echo off
REM Bilsjåfør Registrering Kiosk Starter for Windows
TITLE Bilsjafor Kiosk Starter

REM Sett variabler
SET SERVER_PORT=5000
SET SERVER_HOST=localhost
SET WEB_URL=http://%SERVER_HOST%:%SERVER_PORT%/view?tv=true

REM Gå til prosjektmappen
cd /d %~dp0
cd ..

REM Skriv ut banner
echo.
echo  ===================================================
echo          Bilsjafor Registrering Kiosk
echo  ===================================================
echo.

REM Sjekk om server allerede kjører
netstat -ano | findstr ":%SERVER_PORT%" > nul
if %ERRORLEVEL% equ 0 (
    echo Server kjorer allerede pa port %SERVER_PORT%.
) else (
    echo Starter server...
    start "Bilregistrering Server" cmd /c "npm start"
    echo Venter pa at serveren skal bli klar...
    timeout /t 10 /nobreak > nul
)

REM Sjekk hvilken nettleser som er tilgjengelig og start i kiosk-modus
echo Starter nettleser i kiosk-modus...

REM Prøv Chrome først
where chrome > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starter Google Chrome...
    start "" "chrome" --kiosk --incognito --disable-restore-session-state --noerrdialogs --disable-infobars --no-default-browser-check %WEB_URL%
    goto BROWSER_STARTED
)

REM Prøv Microsoft Edge
where msedge > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starter Microsoft Edge...
    start "" "msedge" --kiosk --inprivate --disable-restore-session-state --noerrdialogs --disable-infobars --no-default-browser-check %WEB_URL%
    goto BROWSER_STARTED
)

REM Prøv Firefox
where firefox > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starter Firefox...
    start "" "firefox" --kiosk %WEB_URL%
    goto BROWSER_STARTED
)

echo FEIL: Ingen støttet nettleser funnet.
goto END

:BROWSER_STARTED
echo.
echo Kiosk-modus startet.
echo For a avslutte, lukk nettleseren med Alt+F4.
echo.

REM Spør om autostart
echo Vil du at kiosk-modus skal starte automatisk ved oppstart?
choice /c JN /m "Trykk J for ja, N for nei"
if %ERRORLEVEL% equ 1 (
    echo Lager snarvei i oppstartsmappen...
    echo @echo off > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\bilregistrering-kiosk.bat"
    echo cd /d "%~dp0" >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\bilregistrering-kiosk.bat"
    echo call "%~f0" >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\bilregistrering-kiosk.bat"
    echo Kiosk-modus vil nå starte automatisk ved oppstart.
)

:END
echo.
echo Trykk en tast for å avslutte denne veiledningen.
pause > nul