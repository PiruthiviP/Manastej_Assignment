# Real-Time Candidate Status Synchronization

A production-grade, minimal full-stack hiring pipeline board featuring **real-time WebSocket synchronization**, **optimistic UI updates with automatic rollback**, and **optimistic concurrency control (OCC)** powered by MongoDB atomic compare-and-set operations.

Designed with a calm, tactile editorial aesthetic inspired by modern tools like Linear and Height.

---

## Key Features

- **Atomic Compare-and-Set (CAS)**: Uses atomic `findOneAndUpdate` queries filtering by `version: expectedVersion` and `status: { $in: allowedFromStatuses }` so race conditions and invalid moves can **never** persist.
- **Append-Only Audit Log**: Every transition captures `{ from, to, changedBy, at }` immutably in a dedicated `StatusEvent` collection for full compliance and history inspection.
- **Real-Time WebSockets**: Instant synchronization between concurrent recruiter sessions via Socket.IO, featuring version checking to ignore stale events.
- **Optimistic UI with Synchronous Rollback**: Instant local drag-and-drop feedback with synchronous snapshotting. If an OCC conflict occurs (409), the card shakes and rolls back to its exact prior state.
- **Hand-Crafted Design System**:
  - Warm off-white background (`#FAF8F5`) with near-black ink (`#1C1B19`).
  - True Dark Mode via `prefers-color-scheme` and a toggle with persistent tokens.
  - Distinct muted status tokens per column with a warm burnt terracotta accent (`#C2542D`).
  - Typography: Google Fonts (*Instrument Serif* for headings, *DM Sans* for UI, *JetBrains Mono* for IDs, OCC versions, and timestamps).
  - Deterministic avatars generated from name hash.
  - Native Drag & Drop: dynamically highlights valid drop targets and dims invalid columns based on the state machine.
  - Responsive under 700px: switches to a clean single-column tabbed view with zero horizontal overflow.
  - Realistic staggered timestamps (minutes, hours, and days ago) so the board looks authentic upon seeding.

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
│   ├── seed.js                   # 12 realistic candidates across all stages + staggered timestamps
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

The test suite runs with Jest and an isolated `mongodb-memory-server` (testing valid transition, illegal transition, stale version CAS conflict, 404 candidate not found, and audit log `from` persistence):

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

## Testing Real-Time Sync & Concurrency

### Step 1: Open Two Browser Tabs
1. Open **`http://localhost:5173`** in **two side-by-side browser windows** (or two tabs).
2. The **ConnectionBadge** in both tabs displays **`Live`** with a green pulsing dot.
3. In Tab 1, keep the active recruiter as **`Aisha (Recruiter)`**.
4. In Tab 2, change the top-bar dropdown to **`Marcus (Recruiter)`** to simulate distinct users.

### Step 2: Instant Drag-and-Drop Sync
1. In Tab 1, drag a candidate card (e.g. *Aisha Patel*) from **Applied** to **Screening**.
2. Notice valid columns highlight with an accent border while invalid columns dim.
3. Upon dropping, Tab 1 updates immediately.
4. Tab 2 receives the Socket.IO broadcast instantly: the card moves smoothly into **Screening** with an accent flash, and a toast reads: *"Aisha Patel moved to Screening."*

### Step 3: Triggering a 409 OCC Conflict
1. In Tab 1, locate *Liam Chen* in **Applied** (version 0).
2. Without refreshing Tab 2, drag *Liam Chen* to **Screening** in Tab 1 (this increments Liam's version to 1 on the server).
3. Immediately in Tab 2, attempt to move *Liam Chen* to **Screening** or **Rejected** (Tab 2 still holds version 0).
4. Tab 2 sends `version: 0`, which the server rejects with **`409 Stale update, refresh and retry`**.
5. Tab 2 shakes the card with a red border (`.rollback-shake`), rolls it back to its original column, and shows a conflict toast:
   > *"Someone else updated this candidate. Refresh to see the latest."*
6. Click the **Refresh** button inside the toast to fetch the authoritative candidate state.

### Step 4: Audit History Drawer
1. Click any candidate card (e.g. *Aisha Patel*).
2. A right-side drawer slides in displaying candidate metadata (ID, email, OCC version) and the complete history timeline.
3. Observe each status event showing `from ➔ to`, who made the change (`changedBy`), and relative/exact timestamps.

### Step 5: Responsive & Theme Testing
1. Click the moon/sun icon in the top navigation to toggle between the editorial light theme and dark mode.
2. Shrink your browser window below **700px** (or inspect at **390px** mobile width):
   - The board switches into a single-column tabbed view (`Applied (1)`, `Screening (3)`, etc.).
   - Header controls compact cleanly with zero horizontal scroll or layout wrapping.

---

## Curl Examples (PATCH Endpoint)

Use these commands to test the atomic CAS update endpoint directly.

> **Tip**: Fetch all candidate IDs with `curl -s http://localhost:5001/api/candidates`.

### 1. Successful Transition (200 OK)
Moves a candidate from `applied` to `screening` with matching version:
```bash
curl -i -X PATCH http://localhost:5001/api/candidates/<CANDIDATE_ID>/status \
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
  "createdAt": "2026-11-09T06:07:05.095Z",
  "updatedAt": "2026-11-10T06:00:56.310Z"
}
```

### 2. Stale Update Conflict (409 Conflict)
Attempting to update using an outdated expected version (e.g. version 0 when candidate is already version 1):
```bash
curl -i -X PATCH http://localhost:5001/api/candidates/<CANDIDATE_ID>/status \
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
curl -i -X PATCH http://localhost:5001/api/candidates/<CANDIDATE_ID>/status \
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

## Limitations & Next Steps

1. **Authentication & Authorization**:
   - *Current*: User attribution is passed via the `x-user` header with a top-bar recruiter switcher for demonstration.
   - *Next Step*: Implement JWT or session-based authentication (e.g. Auth0, OAuth, or passport.js) with role-based access control (RBAC), verifying recruiter permissions before executing state transitions.

2. **Single-Instance WebSockets (Horizontal Scaling)**:
   - *Current*: Socket.IO runs in-memory on a single Express instance.
   - *Next Step*: Attach `@socket.io/redis-adapter` (or Redis Streams) when deploying across multiple containers behind a load balancer so events published on one server instance propagate to clients connected to any instance.

3. **Multi-Tenancy & Requisition Scoping**:
   - *Current*: All candidates belong to a single global board.
   - *Next Step*: Scope candidates and WebSocket rooms by `organizationId` or `jobRequisitionId` to isolate distinct hiring pipelines.

4. **Offline Mutation Queueing**:
   - *Current*: Mutations that fail while offline roll back immediately.
   - *Next Step*: Integrate an IndexedDB offline queue (with Service Workers or TanStack Query) to buffer local changes and replay with automated conflict-resolution upon reconnection.
