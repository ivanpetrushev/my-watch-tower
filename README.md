# My Watch Tower

> **Advanced satellite tracking and pass prediction system with intelligent filtering and horizon masking**

A satellite tracking application that provides pass predictions for multiple ground stations with real-world visibility calculations based on actual horizon obstacles.

If you are here just to run the project, refer to the [Quick Start (deployment)](#quick-start-deployment) section below.

---

## Why This Project?

Traditional satellite tracking tools often fall short in these key areas:

- **Advanced Filtering**: Quickly filter thousands of satellites by custom lists or specific transmitter frequency bands
- **Time-Based Pass Filtering**: Find passes during specific times of day or days of week that fit your schedule
- **Real-World Visibility**: Account for actual horizon obstacles (buildings, trees, mountains) at your observation station, not just theoretical calculations
- **High-Value Pass Extraction**: Automatically identify and extract "high-value" passes based on your criteria and sync them to your calendar
- **Accurate Pass Properties**: Get visibility duration and maximum elevation based on *actual* pass visibility, considering your local horizon mask

---

## Key Features

### Advanced Satellite Filtering

- **Multi-criteria Search**: Filter by satellite name, NORAD ID, custom tags, or frequency bands
- **Frequency Band Filtering**: Support for multiple frequency ranges with uplink/downlink direction
- **Tag Management**: Organize satellites with custom tags (Amateur, METEOR, Orbcomm, YourTag, etc.)
- **Tracked Satellites**: Mark and filter your favorite satellites for quick access

### Ground Station Management

- **Multiple Stations**: Manage unlimited observation locations
- **Horizon Mask Editor**: Interactive polar plot editor to mark obstacles
- **Geographic Visualization**: Interactive maps with geodesic lines and satellite footprints. Real-time visualization of satellite positions and paths

### Pass Prediction Engine

- **Orbit-Based Predictions**: Calculate passes for specific satellites over multiple days
- **Visibility Segmentation**: Split passes into visible segments based on horizon masks
- **Pass Comparison**: Compare the same orbital pass across different ground stations
- **Time Filtering**: Filter passes by time of day and day of week with ability to combine multiple filters

### Real-Time Tracking

- **Live Satellite Position**: Real-time position updates with Doppler shift calculations
- **Pass Progress**: Visual progress indicators for ongoing passes
- **Sky Charts**: Polar plot visualization showing current satellite position and predicted path

### Data Management

- **Automatic TLE Updates**: Configurable TLE sources with automatic refresh
- **SatNOGS DB Integration**: Import transmitter data and satellite information

---

## Screenshots

### Pass Event with Horizon Masking

![Pass Event with Horizon Masking](https://i.imgur.com/sOmGyRO.png)

### Comparing same Pass Event against different ground stations

![Comparing same Pass Event against different ground stations](https://i.imgur.com/e8bHiHs.png)

### Filtering Pass Events

![Filtering Pass Events](https://i.imgur.com/UxeRH49.png)

## Technology Stack

- **Backend**: NestJS 11.x (TypeScript, Node.js), PostgreSQL 18 with Prisma ORM, satellite.js, tle.js, Swagger
- **Frontend**: React 19.x with TypeScript, Vite 7.x, Zustand, React Query, Orval, Lucide icons, Leaflet, SCSS

---

## Quick Start (development)

**Note:** This guide assumes a development environment setup. Proper docker images for non-developer audience coming soon.

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and npm
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ivan.petrushev/my-watch-tower.git
   cd my-watch-tower
   ```

2. **Start infrastructure services**

   ```bash
   docker compose up -d postgres redis pgadmin
   ```

   This starts PostgreSQL, pgAdmin (optional), and Redis (for BullMq).

3. **Install dependencies**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Configure environment**
  
   Copy `backend/.env.sample` to `backend/.env` probably no need to adjust anything.

5. **Run database migrations**

   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

6. **Start development servers**

  Start separately:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

7. **Access the application**

   - Frontend: http://localhost:5173
   - API Docs: http://localhost:3000/api/swagger
   - pgAdmin: http://localhost:8080 (admin@example.com / admin123)

---

## Development Workflow

### Backend Development

```bash
cd backend

# Start dev server with hot reload
npm run dev

# Run database migrations after schema change
npx prisma migrate dev --name migration_name

# Generate Prisma client after schema changes
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

### Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Regenerate API client after backend changes
npm run orval

```

### Database Management

**pgAdmin** is available at http://localhost:8080

Default credentials:

- Email: admin@example.com
- Password: admin123

Server connection is pre-configured in `docker-confs/pgadmin-servers.json`.

---

## Quick start (deployment)

Docker Compose is used for easy deployment. Refer to [Quick Start (development)](#quick-start-development) for local dev setup.

1. **Start the containers**

   Run `docker compose up -d` to run all the services - backend, frontend, Redis, PostgreSQL, pgAdmin (optional), nginx.
   Migrations will be applied automatically via the `backend-migrate` service.

   If you prefer to run the migrations manually, you can run the rest of the services separately.

   ```bash
   docker compose up -d redis postgres
   docker compose up backend-migrate
   docker compose up -d redis postgres backend frontend nginx
   ```

2. **Access the application**

   - Frontend: http://localhost
   - API Docs: http://localhost/api/swagger
   - pgAdmin: http://localhost:8080 (admin@example.com / admin123)
---

## Calendar Integration

My Watch Tower supports exporting pass predictions to calendar applications through standard iCalendar (ICS) format. This enables automatic synchronization of satellite passes with your preferred calendar service.

### Architecture

Calendar feeds are generated dynamically based on your Filter Presets and Ground Stations:

- **One feed per combination**: Each calendar subscription represents a specific Filter Preset applied to a specific Ground Station
- **Dynamic updates**: Feeds reflect the current state of calculated pass events
- **Multiple feeds**: Create separate subscriptions for different filter criteria or observation locations

### Setup Requirements

#### Network Configuration

For external calendar services to access your ICS endpoints, the backend API must be publicly accessible:

- **Local Network**: Configure port forwarding (DNAT) on your router to expose port 3000
- **Alternative Solutions**: Use reverse proxy services like ngrok, Cloudflare Tunnel, or similar
- **Public Address**: Note your public-facing URL (e.g., `https://your-domain.com` or `http://your-ip:3000`)

#### Application Configuration

1. Navigate to **Filter Presets** in the application
2. Enter your Public Address in the configuration field
3. Save the configuration

This address is used to generate absolute URLs for calendar subscription links.

### Usage

#### Export Options

For each Filter Preset and Ground Station combination, you have two options:

A) **Manual Export**

- Click **Export** to download an ICS file
- Import the file into your calendar application
- Note: This is a one-time snapshot; updates require re-exporting

B) **Dynamic Subscription (Recommended)**

- Copy the **iCal Link** URL
- Add as a calendar subscription in your application
- The feed automatically updates as pass predictions change
- Requires your backend to be publicly accessible

### Calendar Format

#### Feed Naming Convention

```
<Ground Station Name> / <Filter Preset Name>
```

#### Event Properties

- **Title**: Satellite name
- **Time**: Pass visibility window (AOS to LOS)
- **Location**: Ground Station name and coordinates
- **Description**:
  - Satellite name
  - Maximum elevation (degrees)
  - Total visible duration (seconds)

### Example Calendar Applications

- **Google Calendar**: Add other calendars > From URL
- **Apple Calendar**: TBD
- **Outlook**: TBD
- **Thunderbird**: TBD

## Roadmap & TODOs

### High Priority

- [x] **Timeline view**: Visualize upcoming passes in a timeline format
- [x] **Current sky**: Real-time sky chart with all visible satellites
- [ ] **Production Docker Images**: Create optimized Docker images for backend and frontend
- [x] **Complete Docker Compose**: Production-ready compose file with all services
- [x] **Calendar Integration**: Sync high-value passes to Google Calendar/iCal

### Features

- [ ] **Satellite info page**: Detailed satellite information,  transmitter list and citations
- [ ] **Pass Logging**: Ability to log observations and attach media
- [ ] **Weather Integration**: Filter passes by weather conditions
- [ ] **Satellite custom tags**: Ability to assign cutom tags to satellite for filtering
- [ ] **Filter saving**: Save and load custom filter presets
- [ ] **Tests**: Both backend and frontend need tests
- [ ] **Pass Statistics**: Historical pass analytics
- [ ] **Multi-language Support**: i18n implementation
- [ ] **News aggregation**: Aggregating news for tracked satellites from several sources

### Infrastructure

- [ ] **CI/CD Pipeline**: GitHub Actions for testing and deployment
- [ ] **Backup Strategy**: Automated database backups
- [ ] **Performance Testing**: Load testing and optimization

---

## Environment Variables

No need to change this, if you are running the provided docker-compose.yml.

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://admin:admin123@localhost:5432/my_watch_tower"
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (`frontend/.env`)

(No .env variables, as getting ENV to work in Vite + Docker is a bit tricky)

---

## Contributing

This project is currently in active development (WIP). Contributions, issues, and feature requests are welcome!

### Development Guidelines

1. Follow existing code style and patterns
2. Write meaningful commit messages
3. Update documentation for new features
4. Add tests for new functionality
5. Run linters before committing

---

## License

This project is licensed under the MIT license - see the LICENSE file for details.

---

## Acknowledgments

- **Claude 4.5** and **Gemini 3 Pro** - AI assistance is just a tool for building a better product. It is every developer's responsibility to use it ethically and effectively.
- **SatNOGS** - Satellite and transmitter database, TLE data sources
- **satellite.js** - SGP4 propagation library
- **TLE.js** - TLE parsing and analysis
- **Leaflet** & **leaflet.geodesic** - Interactive mapping

---

**Status**: 🚧 Work in Progress - Active Development

Built with ❤️ for the satellite tracking community
