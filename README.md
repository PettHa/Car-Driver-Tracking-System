# Bilregistrering

En webapplikasjon for å administrere kjøretøy og ansatte i trygghetsalarmtjenesten, bygget med Node.js og React.

## Prosjektstruktur

```text
bilregistrering/
├── client/                  # React frontend
│   ├── public/              # Statiske filer
│   │   ├── index.html       # HTML-mal
│   │   └── ...
│   ├── src/                 # React-kildekode
│   │   ├── components/      # Gjenbrukbare komponenter
│   │   ├── pages/           # Sidekomponenter
│   │   ├── styles/          # CSS-filer
│   │   ├── App.js           # Hovedapplikasjonskomponent
│   │   └── index.js         # Applikasjonsinngang
│   ├── package.json         # Frontend-avhengigheter
│   └── ...
├── server/                  # Node.js backend
│   ├── config/              # Konfigurasjonsfiler
│   │   ├── db.js            # Database-tilkobling
│   │   └── logger.js        # Logger-konfigurasjon
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.js  # Feilhåndtering
│   │   ├── rateLimiter.js   # Begrensning av forespørsler
│   │   └── validator.js     # Validering av forespørsler
│   ├── models/              # Mongoose-modeller
│   │   ├── Car.js           # Bil-modell
│   │   └── ActivityLog.js   # Aktivitetslogg-modell
│   ├── routes/              # API-ruter
│   │   ├── cars.js          # Bil-relaterte endepunkter
│   │   ├── activityLogs.js  # Aktivitetslogg-endepunkter
│   │   └── index.js         # Rute-aggregator
│   ├── utils/               # Hjelpefunksjoner
│   │   └── security.js      # Sikkerhetsfunksjoner
│   └── server.js            # Hovedserverfil
├── kiosk/                   # Kiosk-modus for visning på TV-skjermer
│   ├── autostart/           # Autostart-konfigurasjon
│   ├── scripts/             # Hjelpeskript
│   ├── start-kiosk.sh       # Hovedskript for Linux/Raspberry Pi
│   ├── start-kiosk.bat      # Versjon for Windows
│   └── README.md            # Kiosk-dokumentasjon
├── logs/                    # Loggfiler
├── package.json             # Backend-avhengigheter
├── .env                     # Miljøvariabler (ikke i versjonskontroll)
└── README.md                # Prosjektdokumentasjon
```

## Oppsett

### Forutsetninger
- Node.js (v14 eller nyere)
- npm (v6 eller nyere)
- MongoDB (v4 eller nyere)

### Installasjon

1. Klon prosjektet:
```bash
git clone <repository-url>
cd bilregistrering
```

2. Installer backend-avhengigheter:
```bash
npm install
```

3. Installer frontend-avhengigheter:
```bash
npm run install-client
```

4. Opprett en .env-fil i rotkatalogen med følgende variabler:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/bilregister
# Legg til andre nødvendige variabler som DATA_SIGNING_SECRET etc.
```

### Kjøring i utviklingsmiljø

Start backend og frontend samtidig:
```bash
npm run dev-full
```

Eller start dem separat:
```bash
# Start backend
npm run dev

# I en annen terminal, start frontend
npm run client
```

Åpne nettleseren på http://localhost:3000

### Kjøring i produksjonsmiljø

1. Bygg React-appen:
```bash
npm run build-client
```

2. Start serveren:
```bash
npm start
```

Åpne nettleseren på http://localhost:5000 (eller den konfigurerte porten)

## Funksjonalitet
- **Registrer/Endre**: Administrer ansatte for biler
- **Vis Oversikt**: Se status for alle biler
- **Admin**: Legg til og rediger bilinformasjon
- **Aktivitetslogg**: Spor alle endringer på biler, ansatte og vedlikeholdsstatus
- **TV-modus**: Viser bilstatus på en stor skjerm, ideell for kontrollrom
- **Kiosk-modus**: Dedikert visning på Raspberry Pi eller andre skjermer

## API-endepunkter
- `GET /api/cars` - Hent alle biler
- `GET /api/cars/:id` - Hent en spesifikk bil
- `POST /api/cars` - Opprett en ny bil
- `PUT /api/cars/:id` - Oppdater en bil
- `PATCH /api/cars/:id/driver` - Oppdater ansattinformasjon
- `PATCH /api/cars/:id/maintenance` - Sett bil til vedlikehold
- `PATCH /api/cars/end-all-trips` - Avslutt alle turer
- `DELETE /api/cars/:id` - Slett en bil
- `POST /api/cars/seed` - Seed initiell data
- `GET /api/activity-logs` - Hent aktivitetslogg
- `GET /api/activity-logs/export` - Eksporter aktivitetslogg til CSV

## Databasemodell

```javascript
Car {
  carNumber: Number,
  registrationNumber: String,
  phoneNumber: String,
  driver: String,          // Ansattens navn
  note: String,
  registrationTime: Date,
  status: String ('available', 'inuse', 'maintenance')
}

ActivityLog {
  action: String ('driver_assigned', 'driver_removed', 'maintenance_set', 'maintenance_cleared', 'car_added', 'car_updated', 'car_deleted'),
  carId: ObjectId,
  carNumber: Number,
  registrationNumber: String,
  previousDriver: String,  // Tidligere ansatt
  newDriver: String,       // Ny ansatt
  note: String,
  userId: String,
  timestamp: Date,
  ipAddress: String,
  userAgent: String
}
```

## Kiosk-modus
Prosjektet inkluderer en kiosk-løsning for å vise biloversikten på dedikerte skjermer eller Raspberry Pi. For detaljert oppsett, se `kiosk/README.md`.

Hovedfunksjoner for kiosk-modus:
- Automatisk oppstart ved systemstart
- Fullskjermsvisning av biloversikten
- Automatisk oppdatering av data hvert minutt
- Deaktivering av skjermsparer og strømstyringsfunksjoner
- Støtte for både Raspberry Pi og Windows

## Tastatursnarveier
- **E** - Gå til Registrer/Endre
- **V** - Gå til Vis Oversikt
- **A** - Gå til Admin
- **L** - Gå til Aktivitetslogg
- **T** - Slå på/av TV-modus
- **S** - Fokusér søkefeltet
- **Esc** - Lukk popup eller avslutt TV-modus

## Sikkerhet
Systemet inkluderer flere sikkerhetsfunksjoner:
- Input-validering og sanering
- Rate limiting for å forhindre overbelastning
- Logging av IP-adresser og brukeragenter for sporbarhet
- HMAC-basert dataintegritetssjekk (via server/utils/security.js), med en betinget verifiseringsmekanisme implementert i PUT-ruten for biler (krever at klienten sender signatur og tidsstempel).
- XSS-beskyttelse gjennom input-sanering

## Lisens
ISC