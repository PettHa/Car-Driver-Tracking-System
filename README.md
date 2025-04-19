# Bilsjåfør Registrering

En webapplikasjon for å administrere kjøretøy og sjåfører, bygget med Node.js og React.

## Prosjektstruktur

```
bilsjafor-registrering/
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
   ```
   git clone <repository-url>
   cd bilsjafor-registrering
   ```

2. Installer backend-avhengigheter:
   ```
   npm install
   ```

3. Installer frontend-avhengigheter:
   ```
   npm run install-client
   ```

4. Opprett en `.env`-fil i rotkatalogen med følgende variabler:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/bilregister
   ```

### Kjøring i utviklingsmiljø

1. Start backend og frontend samtidig:
   ```
   npm run dev-full
   ```

2. Eller start dem separat:
   ```
   # Start backend
   npm run dev
   
   # I en annen terminal, start frontend
   npm run client
   ```

3. Åpne nettleseren på `http://localhost:3000`

### Kjøring i produksjonsmiljø

1. Bygg React-appen:
   ```
   npm run build-client
   ```

2. Start serveren:
   ```
   npm start
   ```

3. Åpne nettleseren på `http://localhost:5000`

## Funksjonalitet

- **Registrer/Endre**: Administrer sjåfører for biler
- **Vis Oversikt**: Se status for alle biler
- **Admin**: Legg til og rediger bilinformasjon
- **Aktivitetslogg**: Spor alle endringer på biler, sjåfører og vedlikeholdsstatus

## API-endepunkter

- `GET /api/cars` - Hent alle biler
- `GET /api/cars/:id` - Hent en spesifikk bil
- `POST /api/cars` - Opprett en ny bil
- `PUT /api/cars/:id` - Oppdater en bil
- `PATCH /api/cars/:id/driver` - Oppdater sjåførinformasjon
- `PATCH /api/cars/:id/maintenance` - Sett bil til vedlikehold
- `PATCH /api/cars/end-all-trips` - Avslutt alle turer
- `DELETE /api/cars/:id` - Slett en bil
- `POST /api/cars/seed` - Seed initiell data
- `GET /api/activity-logs` - Hent aktivitetslogg
- `GET /api/activity-logs/export` - Eksporter aktivitetslogg til CSV

## Databasemodell

```
Car {
  carNumber: Number,
  registrationNumber: String,
  phoneNumber: String,
  driver: String,
  note: String,
  registrationTime: Date,
  status: String (available, inuse, maintenance)
}

ActivityLog {
  action: String (driver_assigned, driver_removed, maintenance_set, maintenance_cleared, car_added, car_updated, car_deleted),
  carId: ObjectId,
  carNumber: Number,
  registrationNumber: String,
  previousDriver: String,
  newDriver: String,
  note: String,
  userId: String,
  timestamp: Date,
  ipAddress: String,
  userAgent: String
}
```

## Lisens

MIT