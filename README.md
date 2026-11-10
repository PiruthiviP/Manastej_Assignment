# Real-Time Candidate Status Synchronization

A production-grade, minimal full-stack hiring pipeline board featuring **real-time WebSocket synchronization**, **optimistic UI updates with automatic rollback**, and **optimistic concurrency control (OCC)** powered by MongoDB atomic compare-and-set operations.

Designed with a calm, tactile editorial aesthetic inspired by modern tools like Linear and Height.

---

## Architecture Summary

```
                       ┌───────────────────────────────┐
                       │     Browser Client A (UI)     │
                       │  (React 18 + Socket.IO Client)│
                       └──────────────┬────────────────┘
                                      │
               1. Optimistic Update   │  3. Broadcast 'candidate:updated'
               (snapshot captured)    │     (version + 1)
                                      ▼
┌──────────────────────────────┐  HTTP PATCH   ┌──────────────────────────────┐
│     Browser Client B (UI)    │◄──────────────┤     Express API Server       │
│  - Receives socket event     │               │  - statusService.changeStatus│
│  - Validates incoming version│               │  - Emits to Socket.IO room   │
│  - FLIP move + accent flash  │               └──────────────┬───────────────┘
└──────────────────────────────┘                              │
                                                              │ 2. Atomic Compare-And-Set
                                                              │    (version + allowed status)
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │      MongoDB / Mongoose      │
                                               │  - Candidates (OCC version)  │
                                               │  - StatusEvents (Audit log)  │
                                               └──────────────────────────────┘
```

### 1. State Machine & Transitions
Stage progressions follow an explicit directed state machine:
```
applied     ──► [ screening, rejected ]
screening   ──► [ assignment, rejected ]
assignment  ──► [ interview, rejected ]
interview   ──► [ offer, rejected ]
offer       ──► [ rejected ]
rejected    ──► [ ] (Terminal stage)
```

### 2. Atomic Compare-and-Set (CAS)
In high-concurrency environments, multiple recruiters may attempt to move or evaluate the same candidate simultaneously. To prevent lost updates and invalid transitions without distributed locks:

1. Target status `to` is validated against allowed transitions to derive `allowedFromStatuses`.
2. An atomic `findOneAndUpdate` operation is executed with:
   ```javascript
   Candidate.findOneAndUpdate(
     {
       _id: id,
       version: expectedVersion,
       status: { $in: allowedFromStatuses }
     },
     {
       $set: { status: to },
       $inc: { version: 1 }
     },
     { new: false } // Returns PRE-update document
   );
   ```
3. **Guaranteed Atomicity**: Including `status: { $in: allowedFromStatuses }` in the atomic database query guarantees that an illegal move can **never** persist under any race condition.
4. If null is returned, the service inspects the document to return exact HTTP statuses:
   - `404`: Candidate not found
   - `409`: Stale version conflict (someone else moved the candidate first)
   - `400`: Illegal state transition

### 3. Append-Only Audit Log
Every successful update generates an immutable `StatusEvent` storing:
- `candidateId`: Reference to the candidate
- `from`: Pre-update status (authoritatively captured via `{ new: false }`)
- `to`: Target status
- `changedBy`: Recruiter attribution from `x-user` request header
- `at`: ISO timestamp

---

## Repository Structure

```
/
├── server/
│   ├── index.js                  # Express app, HTTP server, Socket.IO setup, Mongo listener
│   ├── config.js                 # Environment configuration (PORT, MONGO_URI, CLIENT_URL)
│   ├── models/
│   │   ├── Candidate.js          # Candidate schema with status enum & OCC version
│   │   └── StatusEvent.js        # Append-only audit log collection
│   ├── routes/
│   │   └── candidates.js         # GET /api/candidates, PATCH status, GET history
│   ├── services/
│   │   └── statusService.js      # CAS business logic, TRANSITIONS map, AppError
│   ├── middleware/
│   │   └── errorHandler.js       # Centralized error handler (CastError, AppError, 500)
│   ├── seed.js                   # 12 realistic candidates across all stages + audit history
│   ├── embedded.js               # Zero-dependency runner using in-memory MongoDB
│   ├── tests/
│   │   └── statusService.test.js # Jest + mongodb-memory-server test suite
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── candidates.js     # REST client with error throwing on non-2xx
│   │   ├── hooks/
│   │   │   └── useCandidateSync.js # WebSocket sync, OCC version merge, optimistic updates
│   │   ├── components/
│   │   │   ├── CandidateBoard.jsx  # Kanban board container & mobile stage tabs
│   │   │   ├── StatusColumn.jsx    # Column zone with DnD valid/invalid target highlights
│   │   │   ├── CandidateCard.jsx   # Card presentational component with relative time
│   │   │   ├── StatusSelect.jsx    # Keyboard/touch fallback stage progression dropdown
│   │   │   ├── ConnectionBadge.jsx # Live / Reconnecting WebSocket status pill
│   │   │   ├── Drawer.jsx          # History timeline side drawer
│   │   │   └── Toast.jsx           # Minimal conflict and sync toasts
│   │   ├── styles/
│   │   │   ├── tokens.css          # CSS color tokens, dark mode variables, 4px spacing
│   │   │   ├── base.css            # Typography, resets, focus rings, reduced-motion
│   │   │   └── components.css      # Component layouts, animations (FLIP, flash, shake)
│   │   ├── App.jsx               # Top bar, recruiter attribution switcher, theme toggle
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example
├── package.json                  # Root orchestration scripts
└── README.md
```

---

## Setup & Running

### Prerequisites
- Node.js (v18 or higher recommended; developed and tested on Node v22)
- npm (v9 or higher)

### 1. Environment Variables

#### Server (`server/.env`):
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/candidate_sync
CLIENT_URL=http://localhost:5173
```

#### Client (`client/.env`):
```env
VITE_API_URL=http://localhost:5001
```

---

### 2. Installation

Install dependencies for both server and client:

```bash
# From repository root
npm run install:all

# Or individually
cd server && npm install
cd ../client && npm install
```

---

### 3. Running Unit Tests

The test suite runs with Jest and an isolated `mongodb-memory-server` (valid transition, illegal transition, stale version CAS conflict, 404 candidate not found, and audit log `from` persistence):

```bash
# From repository root
npm test

# Or inside /server
cd server && npm test
```

---

### 4. Running the Application

You can run the backend in standard mode (connecting to a local or remote MongoDB instance) or in zero-setup embedded mode (which starts an in-memory MongoDB instance automatically):

#### Option A: Embedded In-Memory Dev Mode (Zero external DB required)
```bash
# Terminal 1: Starts in-memory MongoDB, seeds 12 candidates, and runs Express on port 5001
npm run server:dev

# Terminal 2: Starts Vite React client on port 5173
npm run client
```

#### Option B: Standard MongoDB Mode
```bash
# 1. Seed database
cd server && npm run seed

# 2. Start backend server
npm start

# 3. In another terminal, start client
cd ../client && npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## Curl Examples (PATCH Endpoint)

Use these commands to test the atomic CAS update endpoint directly.

> **Tip**: Replace `6af2b2c0fe0b0c046df299be` below with any candidate ID retrieved from `curl http://localhost:5001/api/candidates`.

### 1. Successful Transition (200 OK)
Moves a candidate from `applied` to `screening` with matching version:
```bash
curl -i -X PATCH http://localhost:5001/api/candidates/6af2b2c0fe0b0c046df299be/status \
  -H "Content-Type: application/json" \
  -H "x-user: Recruiter Aisha" \
  -d '{"status":"screening","version":0}'
```
**Response (200 OK):**
```json
{
  "_id": "6af2b2c0fe0b0c046df299be",
  "name": "Liam Chen",
  "email": "liam.chen@example.com",
  "role": "Senior Distributed Systems Engineer",
  "status": "screening",
  "version": 1,
  "createdAt": "2026-11-10T05:59:28.613Z",
  "updatedAt": "2026-11-10T06:00:56.310Z"
}
```

### 2. Stale Update Conflict (409 Conflict)
Attempting to update using an outdated expected version (e.g. version 0 when candidate is already version 1):
```bash
curl -i -X PATCH http://localhost:5001/api/candidates/6af2b2c0fe0b0c046df299be/status \
  -H "Content-Type: application/json" \
  -H "x-user: Recruiter Marcus" \
  -d '{"status":"assignment","version":0}'
```
**Response (409 Conflict):**
```json
{
  "error": "Stale update, refresh and retry"
}
```

### 3. Illegal Transition (400 Bad Request)
Attempting an invalid jump (e.g. directly from `applied` to `interview`):
```bash
curl -i -X PATCH http://localhost:5001/api/candidates/6af2b2c0fe0b0c046df299be/status \
  -H "Content-Type: application/json" \
  -H "x-user: Recruiter Marcus" \
  -d '{"status":"interview","version":0}'
```
**Response (400 Bad Request):**
```json
{
  "error": "Invalid transition from applied to interview"
}
```

---

## How to Test Real-Time Sync

1. Open **`http://localhost:5173`** in **two separate browser windows** side-by-side (or two browser tabs).
2. Notice the **ConnectionBadge** shows **`Live`** with a green pulsing dot in both windows.
3. In Window 1, select a different active user from the top bar (e.g. **`Marcus (Recruiter)`**) to simulate two different people working simultaneously.
4. **Drag & Drop**:
   - In Window 1, drag a card from **Applied** to **Screening**.
   - Notice that while dragging, only allowed drop target columns (**Screening**, **Rejected**) highlight in terracotta, while invalid columns dim.
   - Upon release, Window 1 updates **instantly** (optimistic update).
   - In Window 2, the card animates smoothly into **Screening** with a brief accent flash, and a toast appears: *"Liam Chen moved to Screening."*
5. **Inspect History**:
   - Click the card in either window to open the right-side **Audit Drawer**.
   - The timeline shows the exact progression (`applied -> screening`), attributed to *"by Marcus (Recruiter)"*, with relative and exact timestamps.
6. **Concurrent Conflict (OCC Rollback Simulation)**:
   - In Window 1, disconnect your network or turn off Wi-Fi briefly, then try moving a card.
   - The card will shake with a red border (`.rollback-shake`), revert back to its snapshot location immediately, and a toast will explain the issue without losing any data.
   - If an update is submitted with an older version, a **409 Stale Update** toast appears with a one-click **Refresh** action.

---

## Limitations & Next Steps

1. **Authentication & Authorization**:
   - *Current*: User attribution is passed via the `x-user` header with a top-bar recruiter switcher for testing.
   - *Next Step*: Implement JWT or session-based authentication (e.g., Auth0 or passport.js) with role-based access control (RBAC), verifying user permissions before executing state transitions.

2. **Single-Instance WebSockets (Scaling)**:
   - *Current*: Socket.IO runs in-memory on a single Express instance.
   - *Next Step*: When deploying behind a load balancer with multiple backend instances, attach `@socket.io/redis-adapter` (or Redis Streams) so events published on one server instance are broadcast to clients connected to other server instances.

3. **Multi-Tenancy & Workspaces**:
   - *Current*: All candidates share a single organization pipeline.
   - *Next Step*: Scope candidate records and Socket.IO rooms by `organizationId` or `jobRequisitionId` to prevent cross-team data leaks.

4. **Offline Queueing**:
   - *Current*: In-flight updates that fail roll back immediately.
   - *Next Step*: Implement an IndexedDB offline queue (e.g., with Service Workers or TanStack Query) to buffer mutations while offline and replay with conflict-resolution strategies upon reconnection.
