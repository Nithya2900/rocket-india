# Event Pass Management System

A simple full-stack web application for managing college technical events, student registrations, cancellations, and event-day check-ins.

This project is designed as a minimal MVP that implements the core requirements of an Event Pass Management System.

## Features

### Organizer

- Create an event
- Set event name, date/time, and maximum capacity
- View event summary
- View registered student count
- View checked-in student count
- View events sorted by registration count

### Student

- View available events
- Register for an event
- Duplicate registration is prevented
- Registration is blocked when the event is full
- Cancel registration before the event
- Available seats are restored after cancellation
- Check in on the event day
- Only registered students can check in
- Check-in is allowed only once

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express.js

### Database

- SQLite

---

## System Architecture

```text
┌──────────────────────┐
│      React UI        │
│      Frontend        │
└──────────┬───────────┘
           │
           │ HTTP / REST API
           ▼
┌──────────────────────┐
│    Express Server    │
│      Backend         │
└──────────┬───────────┘
           │
           │ SQL Queries
           ▼
┌──────────────────────┐
│     SQLite Database  │
│   database.sqlite    │
└──────────────────────┘
```

---

## Project Structure

```text
GCC/
│
├── server/
│   ├── database.sqlite
│   ├── db.js
│   └── index.js
│
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## Database Design

### Users

Stores students and organizers.

```text
users
----------------
id
name
email
role
```

Roles:

```text
ORGANIZER
STUDENT
```

### Events

Stores event information.

```text
events
----------------
eid
ename
datetime
capacity
seats
status
```

Where:

- `capacity` = maximum number of students allowed
- `seats` = currently available seats
- `status` = `OPEN` or `CLOSED`

### Registrations

Stores student registrations.

```text
registrations
----------------
reg_id
user_id
event_id
status
```

A student can register for the same event only once.

### Check-ins

Stores event-day check-in information.

```text
checkins
----------------
reg_id
event_id
checkin_status
```

A registration can be checked in only once.

---

## Core Business Rules

### Create Event

An organizer creates an event using:

- Event Name
- Event Date & Time
- Maximum Capacity

New events are created with:

```text
status = OPEN
seats = capacity
```

### Register for Event

```text
Student
   │
   ▼
Already Registered?
   │
   ├── Yes → Reject
   │
   └── No
        │
        ▼
   Seats Available?
        │
        ├── No → Reject
        │
        └── Yes
             │
             ▼
         Register Student
             │
             ▼
         Decrease Seats
```

### Cancel Registration

A student can cancel their registration before the event.

```text
Cancel Registration
        │
        ▼
Remove Registration
        │
        ▼
Increase Available Seats
```

### Check-In

Check-in is allowed only when:

- The student is registered for the event
- The current date is the event date
- The student has not already checked in

```text
Check-In Request
       │
       ▼
Registration Exists?
       │
       ├── No → Reject
       │
       ▼
Is It Event Day?
       │
       ├── No → Reject
       │
       ▼
Already Checked In?
       │
       ├── Yes → Reject
       │
       ▼
    Check In
```

---

## API Endpoints

### Users

Get all users:

```http
GET /api/users
```

### Events

Get all events:

```http
GET /api/events
```

Create an event:

```http
POST /api/events
```

Example request:

```json
{
  "organizerId": 1,
  "ename": "Tech Fest",
  "datetime": "2026-09-20T10:00",
  "capacity": 100
}
```

Get event summary:

```http
GET /api/events/:id/summary
```

Get events sorted by registration count:

```http
GET /api/events/top-registrations
```

### Registrations

Register for an event:

```http
POST /api/registrations
```

Example request:

```json
{
  "userId": 2,
  "eventId": 1
}
```

Cancel registration:

```http
DELETE /api/registrations/:id
```

Get a student's registrations:

```http
GET /api/registrations/student/:userId
```

### Check-In

Check in to an event:

```http
POST /api/checkins
```

Example request:

```json
{
  "regId": 1,
  "userId": 2
}
```

Get check-in status:

```http
GET /api/checkins/:registrationId
```

---

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
```

Navigate to the project:

```bash
cd GCC
```

Install dependencies:

```bash
npm install
```

---

## Running the Application

The frontend and backend run separately.

### Start Backend

Open a terminal:

```bash
cd server
node index.js
```

The backend runs on:

```text
http://localhost:5000
```

### Start Frontend

Open another terminal from the project root:

```bash
npm run dev
```

Vite will provide the frontend URL, normally:

```text
http://localhost:5173
```

Open the URL in a browser.

---

## Application Flow

### Organizer Flow

```text
Organizer
    │
    ▼
Create Event
    │
    ▼
Event Created
    │
    ▼
Students Register
    │
    ▼
View Event Summary
    │
    ├── Registered Count
    │
    └── Checked-In Count
```

### Student Flow

```text
Student
   │
   ▼
View Events
   │
   ▼
Register
   │
   ├── Event Full
   │       └── Registration Rejected
   │
   └── Available
           │
           ▼
       Registration
           │
           ├── Cancel Registration
           │
           └── Event Day
                  │
                  ▼
                Check-In
```

---

## SQL Requirement

The system supports displaying events with the highest number of registrations.

SQL query:

```sql
SELECT
    e.ename AS event_name,
    COUNT(r.reg_id) AS total_registrations
FROM events e
LEFT JOIN registrations r
    ON e.eid = r.event_id
GROUP BY e.eid, e.ename
ORDER BY total_registrations DESC;
```

---

## API Architecture

The backend follows a simple layered approach:

```text
React UI
   │
   ▼
API Request
   │
   ▼
Express Route
   │
   ▼
Business Logic
   │
   ▼
Database Operations
   │
   ▼
SQLite
```

The application intentionally avoids unnecessary complexity and focuses on implementing the required event management functionality.

---

## Screens

### Organizer Dashboard

The organizer can:
- Create events
- View event capacity
- View registration count
- View check-in count
- View registration rankings

### Student Dashboard

The student can:
- View events
- Register
- Cancel registration
- Check in

---

## Error Handling

The backend validates important business rules such as:
- Duplicate registration
- Event capacity
- Invalid user role
- Invalid event
- Unauthorized registration cancellation
- Check-in without registration
- Duplicate check-in
- Check-in outside the event day

---

## Future Improvements
The current version intentionally focuses on the core requirements.
Possible future enhancements:
- User authentication
- JWT-based authorization
- Organizer and student login
- QR-code based event passes
- Email notifications
- Event search and filtering
- Automated tests
- Deployment
- Improved UI/UX
---

## License

This project is developed for educational and coding-round purposes.
