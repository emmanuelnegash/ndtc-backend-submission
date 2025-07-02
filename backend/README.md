# Backend

An incomplete REST API service for organizing campaigns and tracking event metrics.

## Setup and Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Candidates
- `GET /api/candidates` - Get all candidates (supports `orderBy` and `order` query params)
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate

### Events
- `GET /api/events` - Get all events (supports `candidateId`, `orderBy`, `order` query params)
- `POST /api/events` - Create new event

### Volunteers
- `GET /api/volunteers` - Get all volunteers
- `POST /api/volunteers` - Create new volunteer
- `PUT /api/volunteers/:id` - Update volunteer
- `DELETE /api/volunteers/:id` - Delete volunteer

### Attendances
- `GET /api/attendances` - Get all attendances
- `POST /api/attendances` - Create new attendance
- `DELETE /api/attendances/:id` - Delete attendance

### Admin
- `POST /api/admin/clear` - Clear all data from the database
- `POST /api/admin/generate` - Generate random sample data
- `GET /api/admin/dashboard-metrics?candidateIds=1,2,3` - Get dashboard metrics (attendance, donations, volunteer signups) over time for selected candidates

### Health Check
- `GET /health` - Service health status

## Example Requests

### Create Candidate
```bash
curl -X POST http://localhost:3001/api/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "district": "District 5",
    "office": "Mayor"
  }'
```

### Create Event
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": 1,
    "name": "Fundraising Dinner",
    "date": "2025-07-15",
    "startTime": "18:00",
    "endTime": "21:00",
    "moneyRaised": 5000
  }'
```

### Generate Sample Data
```bash
curl -X POST http://localhost:3001/api/admin/generate
```

### Get Dashboard Metrics
```bash
curl 'http://localhost:3001/api/admin/dashboard-metrics?candidateIds=1,2,3'
```

## Sample Data Generation
- On app start, if the database is empty and the `generateData` flag is set to `true` in `backend/src/app.ts`, sample data will be generated automatically.
- You can also generate or clear data at any time using the admin endpoint `/admin`.
- The database is in-memory and resets on every server restart.
