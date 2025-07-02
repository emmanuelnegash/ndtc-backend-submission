# NDTC Campaign Tracker

A tiny application for organizing campaigns and tracking event metrics. This app is currently minimal in functionality. For this technical assessment, we would like you to complete some tasks and also implement a larger feature. See the bottom of the page for further instructions. Ideally, we'd like you to spend 3 hours or less on this assignment. It's all right if you don't get to everything—this is a chance for us to see how you tackle problems!

## Quick Start

1. **Install all dependencies**
```bash
npm install
```

2. **Start both frontend and backend:**
```bash
npm run dev
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Project Structure

```
ndtc-campaign-tracker/
├── backend/          # Express.js API server
├── frontend/         # Next.js frontend application (App Router)
├── package.json      # Root package with workspace scripts
└── README.md         # This file
```

## Architecture

- **Backend**: Node.js/Express REST API with TypeScript
- **Frontend**: Next.js (App Router) with TypeScript
- **Database**: SQLite (in-memory for development)
- **Communication**: RESTful API with JSON

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run dev:backend` - Start only backend
- `npm run dev:frontend` - Start only frontend

## API Endpoints

### Candidates
- `GET /api/candidates` - List all candidates
- `POST /api/candidates` - Create new candidate
- `GET /api/candidates/:id` - Get candidate details
- `PUT /api/candidates/:id` - Update candidate

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event

## Current Implementation Status
✅ **TODOs (Required)**
- If an attendee donates to an event, let's add that to the Event's `Total Monies Raised`
    - Account for the case where an `Attendance` record is deleted
- Our API could use better error handling; implement some changes and note them in this README
- Implement pagination for our API and ensure all our endpoints support full CRUD operations
- Add at least one of the following:
    - Add rate limiting and request logging middleware
    - Add integration/unit tests
    - Add support for a more persistent database

💡 **Additional Features (Pick one!)**
Currently, our application has limited functionality but would benefit from additional features to enhance the user experience! For this exercise, please pick one feature to implement. It should be one that you think would greatly enhance user experience or reduce security gaps, etc. You can select one from the list below or think of one yourself! We would also love to see a design diagram, but that is completely optional. You can use a tool like [Whimsical](https://whimsical.com/) or [Figma](https://www.figma.com/).
- Data recovery for accidentally deleted data
- Add authentication and role-based access control (admin/user separation):
  - Right now, anyone can stumble upon the `/admin` dashboard. Add some basic authentication so we can control access to that page and also be able to "upgrade" a user to an admin
- Accessibility improvements (ARIA labels, keyboard navigation)
- A way to bulk import candidates, events, volunteers, and attendances (e.g., CSV, JSON):
  - We should also be able to create an export PDF or print-out
- Dark mode toggle and theme customization
- Create your own feature!

## Production Deployment Plan

(Tell us how you would deploy this to production here!)

