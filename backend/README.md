# Backend

A complete REST API service for organizing campaigns and tracking event metrics.

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

## What's Implemented

✅ **Required tasks completed:**

- Attendances automatically update Event `moneyRaised` when created/deleted/updated.
- Pagination support on all GET endpoints (`page`, `limit` query params).
- Full CRUD support on Candidates, Events, Volunteers, Attendances.
- Improved error handling and structured API responses.
- Authentication API (`/api/auth/login`) using JWT.
- **Role-based access control** for `/admin/protected` using `admin` role.
- Logging with `pino` logger.
- Health check endpoint at `/health`.

## API Endpoints

### Auth

- `POST /api/auth/login` – Authenticate user and return JWT token.
- `GET /api/admin/protected` – Example protected admin-only route.

### Candidates

- `GET /api/candidates` - Get all candidates (supports `orderBy` and `order` query params)
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Delete candidate

### Events

- `GET /api/events` - Get all events (supports `candidateId`, `orderBy`, `order` query params)
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Volunteers

- `GET /api/volunteers` - Get all volunteers
- `POST /api/volunteers` - Create new volunteer
- `PUT /api/volunteers/:id` - Update volunteer
- `DELETE /api/volunteers/:id` - Delete volunteer

### Attendances

- `GET /api/attendances` - Get all attendances
- `POST /api/attendances` - Create new attendance
- `PUT /api/attendances/:id` - Update attendance
- `DELETE /api/attendances/:id` - Delete attendance

### Admin Utilities

- `POST /api/admin/clear` - Clear all data from the database
- `POST /api/admin/generate` - Generate random sample data
- `GET /api/admin/dashboard-metrics?candidateIds=1,2,3` - Get dashboard metrics (attendance, donations, volunteer signups) over time for selected candidates

### Health Check

- `GET /health` - Service health status

## Example Requests

### Authenticate and get token:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Use JWT token for protected admin route:

```bash
curl -H "Authorization: Bearer <your-token>" http://localhost:3001/api/admin/protected
```

### Create Candidate:

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

### Create Event:

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

### Generate Sample Data:

```bash
curl -X POST http://localhost:3001/api/admin/generate
```

### Get Dashboard Metrics:

```bash
curl 'http://localhost:3001/api/admin/dashboard-metrics?candidateIds=1,2,3'
```

### Pagination Example:

```bash
curl 'http://localhost:3001/api/candidates?page=1&limit=10'
```

## Running Tests

### Integration tests:

```bash
npx jest tests/integration/api/event.api.test.ts
npx jest tests/integration/api/volunteer.api.test.ts
npx jest tests/integration/api/candidate.api.test.ts
npx jest tests/integration/api/authrole.api.test.ts
npx jest tests/integration/api/auth.api.test.ts
npx jest tests/integration/api/attendance.api.test.ts
```

### Unit tests:

#### Controller unit tests:

```bash
npx jest tests/unit/controllers/authorizeController.test.ts
npx jest tests/unit/controllers/attendanceController.test.ts
npx jest tests/unit/controllers/authController.test.ts
npx jest tests/unit/controllers/candidateController.test.ts
npx jest tests/unit/controllers/eventController.test.ts
npx jest tests/unit/controllers/volunteerController.test.ts
```

#### Middleware unit tests:

```bash
npx jest tests/unit/middlewares/roleMiddleware.test.ts
npx jest tests/unit/middlewares/authMiddleware.test.ts
```

## Sample Data Generation

- Automatically seeded on startup unless `GENERATE_SAMPLE_DATA=false`.
- Can also manually seed using:

  ```bash
  curl -X POST http://localhost:3001/api/admin/generate
  ```

## Notes for Reviewers

- JWT secret and `admin` credentials are hardcoded for testing:
  - Username: `admin`
  - Password: `password`

- Pagination params available on all GET collections.
- Logging enhanced with `pino` for structured logs.
- Error handling improved for client-friendly responses.

## Deployment Plan

### Overview

This application is designed for deployment using Docker, Terraform, and CI/CD pipelines. Below is the deployment plan:

### Docker Setup

1. **Dockerfile**:
   - Containerizes the Node.js application.
   - Uses a production-ready Node.js image.
   - Exposes port `3001`.

2. **Docker Compose**:
   - Orchestrates the API and PostgreSQL database.
   - Ensures network isolation between services.
   - Persists PostgreSQL data using volumes.

### Infrastructure Provisioning

1. **Terraform**:
   - Provisions AWS resources:
     - EC2 instance for the API server.
     - RDS PostgreSQL for the database.
     - VPC and security groups for secure networking.

2. **Commands**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

### CI/CD Pipeline

1. **GitHub Actions**:
   - Automates testing, building, and deployment.
   - Example workflow:

     ```yaml
     name: CI/CD Pipeline

     on:
       push:
         branches:
           - main

     jobs:
       build-and-deploy:
         runs-on: ubuntu-latest

         steps:
           - uses: actions/checkout@v3

           - name: Set up Node.js
             uses: actions/setup-node@v3
             with:
               node-version: 18

           - name: Install dependencies and run tests
             run: |
               npm install
               npm run build
               npm test

           - name: Build Docker image
             run: docker build -t my-app:latest .

           - name: Deploy to server
             uses: appleboy/ssh-action@master
             with:
               host: ${{ secrets.SERVER_IP }}
               username: ubuntu
               key: ${{ secrets.SSH_KEY }}
               script: |
                 cd /var/www/campaign-tracker
                 git pull origin main
                 docker-compose down
                 docker-compose up -d --build
     ```

### Security Hardening

- JWT-based authentication and role-based access control.
- `helmet` middleware for secure HTTP headers.
- Secure CORS configuration.
- PostgreSQL database not publicly exposed.

---

Let me know if you need further details or additional sections!
