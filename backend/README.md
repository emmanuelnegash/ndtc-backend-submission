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
- ✅ **Persistent Database Support**
  - File-based SQLite database for development/production environments
  - Data survives application restarts
  - Uses `:memory:` for tests, configurable file path via `DB_FILE` environment variable
  - Database files stored in [`backend/data/`](backend/data/) directory

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

---

## Production Deployment Plan

### Overview

This application is designed for cloud-native deployment using containerization, infrastructure as code, and automated CI/CD pipelines for reliable production workloads with enterprise-grade authentication and scalability.

### Deployment Architecture

```
Internet → ALB → ECS Fargate → RDS PostgreSQL
                       ↓
               CloudWatch Logs & Monitoring
                       ↓
            Amazon Cognito (SSO & User Pools)
```

### Deployment Workflow

#### 1. Containerization Strategy

- **Docker**: Multi-stage builds for optimized production images
- **Base Image**: Node.js Alpine for minimal attack surface
- **Security**: Non-root user, dependency vulnerability scanning
- **Environment**: Configurable via AWS Secrets Manager

#### 2. Infrastructure Provisioning (Terraform)

- **Cloud Platform**: AWS with infrastructure as code
- **Compute**: ECS Fargate for serverless container orchestration
- **Database**: RDS PostgreSQL with Multi-AZ deployment
- **Authentication**: Amazon Cognito User Pools for SSO integration
- **Networking**: VPC with private subnets and security groups
- **Storage**: Encrypted EBS volumes and RDS encryption at rest

#### 3. Authentication & Authorization Evolution

- **Phase 1 (Current)**: JWT-based authentication with hardcoded credentials
- **Phase 2 (Production)**: Amazon Cognito User Pools integration
- **Phase 3 (Enterprise)**: SAML/OIDC SSO with corporate identity providers
- **Features**: MFA, password policies, account recovery, user management

#### 4. CI/CD Pipeline (GitHub Actions)

- **Trigger**: Automated on push to main branch
- **Testing**: Unit tests, integration tests, security scanning
- **Build**: Multi-stage Docker builds with layer caching
- **Deploy**: Blue-green deployment with automatic rollback
- **Monitoring**: Deployment notifications and health checks

#### 5. Database Strategy

- **Development**: File-based SQLite with persistent storage
- **Production**: Amazon RDS PostgreSQL with automated backups
- **Scaling**: Read replicas and connection pooling
- **Security**: Encryption, VPC isolation, IAM database authentication

#### 6. Monitoring & Observability

- **Health Checks**: Comprehensive application and database health endpoints
- **Logging**: Structured JSON logs with CloudWatch integration
- **Metrics**: Custom application metrics and AWS CloudWatch dashboards
- **Alerting**: CloudWatch alarms for performance and error thresholds

### Future Scalability Features

#### Amazon Cognito Integration

```typescript
// Future authentication with Cognito User Pools
const cognitoConfig = {
  userPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
  clientId: process.env.AWS_COGNITO_CLIENT_ID,
  region: process.env.AWS_REGION,
};

// SSO Support with SAML/OIDC providers
// - Active Directory integration
// - Google Workspace SSO
// - Microsoft Azure AD
// - Custom SAML providers
```

#### RDS PostgreSQL Production Setup

```bash
# Multi-AZ deployment for high availability
# Read replicas for scaling read operations
# Automated backups with point-in-time recovery
# Performance Insights for query optimization
# Connection pooling with PgBouncer
```

### Quick Deployment Commands

```bash
# Local development with persistent data
npm run dev

# Infrastructure deployment
terraform init && terraform plan && terraform apply

# Application deployment via GitHub Actions
git push origin main  # Triggers automated CI/CD

# Manual deployment (if needed)
docker build -t campaign-tracker .
aws ecr get-login-password | docker login --username AWS
docker push $ECR_REPOSITORY:latest
```

### Environment Configuration

**Development**: SQLite file database, debug logging, basic JWT auth  
**Staging**: RDS PostgreSQL, structured logs, Cognito integration  
**Production**: Multi-AZ RDS, CloudWatch monitoring, enterprise SSO

### Security & Compliance

- **Authentication**: Cognito User Pools with MFA
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encryption at rest and in transit
- **Network Security**: VPC isolation and security groups
- **Compliance**: SOC 2, GDPR-ready user data handling
- **Monitoring**: AWS CloudTrail for audit logging
