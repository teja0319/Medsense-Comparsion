# System Architecture - Visual Guide

## 🏗️ High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js/React)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐        ┌──────────────────────┐   │
│  │  ProjectDashboard         │        │    Admin Page        │   │
│  │  ├─ Role Detection        │        │  (/admin)            │   │
│  │  ├─ Admin Button (Super)  │        ├─ [Tab] Users Mgmt    │   │
│  │  └─ Claims Table          │        ├─ [Tab] Claims Assign │   │
│  │                           │        └─ Route Protection    │   │
│  └────────────┬──────────────┘        └──────────────────────┘   │
│               │                                                    │
│  ┌────────────▼──────────────┐        ┌──────────────────────┐   │
│  │   ClaimsTable Component   │        │ UsersManagement      │   │
│  │   ├─ isSuperadmin check   │        │ Component            │   │
│  │   ├─ Endpoint Selection   │        ├─ User list/CRUD      │   │
│  │   │  ├─ /jobs (super)     │        ├─ Role management     │   │
│  │   │  └─ /assigned-jobs    │        └─ Status toggle       │   │
│  │   │     (user)            │                                 │   │
│  │   └─ Real-time refresh    │        ┌──────────────────────┐   │
│  └─────────────────────────────┘        │ ClaimsAssignment     │   │
│                                         │ Component            │   │
│                                         ├─ Set claim limits    │   │
│                                         ├─ Assign claims       │   │
│                                         ├─ Queue visualization │   │
│                                         └─ Queue processing    │   │
│                                         └──────────────────────┘   │
│                                                                     │
└────────────────────────────┬──────────────────────────────────────┘
                             │ HTTP Requests (JSON)
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                   BACKEND (Next.js API Routes)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Authentication Layer (lib/auth.ts)                             │
│  ├─ JWT Token generation (includes role)                        │
│  ├─ Token verification                                          │
│  └─ getCurrentUser() helper                                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Routes - User Management                             │   │
│  │ ├─ GET /api/users → List all users [SUPER]              │   │
│  │ ├─ POST /api/users/create → Create user [SUPER]         │   │
│  │ ├─ PUT /api/users → Update role/status [SUPER]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Routes - Claims Management                           │   │
│  │ ├─ GET /api/claims/[userId] → Get claims [SELF/SUPER]   │   │
│  │ ├─ POST /api/claims/[userId] → Assign/set limit         │   │
│  │ ├─ DELETE /api/claims/[userId] → Release claim          │   │
│  │ ├─ GET /api/claims/queue → View queue [SUPER]           │   │
│  │ └─ POST /api/claims/queue → Process queue [SUPER]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Routes - Jobs/Projects (Role-Filtered)              │   │
│  │ ├─ GET /api/projects/[id]/jobs → All jobs [SUPER]       │   │
│  │ └─ GET /api/projects/[id]/assigned-jobs → User jobs     │   │
│  │    [Filtered by role]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Service Layer                                                    │
│  ├─ lib/userService.ts → User CRUD, role management            │
│  ├─ lib/claimsService.ts → Claims logic, auto-queuing          │
│  └─ lib/password.ts → Password hashing                         │
│                                                                   │
└────────────────────────────┬──────────────────────────────────────┘
                             │ Database Queries
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    MongoDB Database                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Collections:                                                    │
│  ├─ users [email, password, role, isActive, timestamps]        │
│  ├─ user_claim_limits [user_id, claim_limit]                  │
│  ├─ claim_assignments [user_id, claim_id, assigned_at]        │
│  ├─ claim_queue [user_id, claim_id, queued_at, priority]      │
│  └─ parsing_jobs [existing - claims/jobs data]                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Role-Based Access Control Flow

```
                        ┌─────────────────┐
                        │   User Logs In  │
                        └────────┬────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Authenticate via JWT    │
                    │  (includes role)         │
                    └────────────┬─────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
        ┌─────────▼──────────┐       ┌──────────▼───────────┐
        │  SUPERADMIN        │       │   REGULAR USER       │
        │  (role='superadmin')│      │   (role='user')      │
        │                     │       │                     │
        ├─ See Admin button   │       ├─ No Admin button    │
        ├─ Access /admin      │       ├─ No /admin access   │
        │                     │       │                     │
        ├─ /api/users        │       ├─ /api/users → 401   │
        │  (GET all users)   │       │                     │
        │                     │       │                     │
        ├─ /api/jobs        │       ├─ /assigned-jobs     │
        │  (GET ALL jobs)    │       │  (GET only own)     │
        │                     │       │                     │
        ├─ /api/claims/*     │       ├─ /api/claims/own    │
        │  (FULL access)     │       │  (LIMITED)          │
        │                     │       │                     │
        └─ Can manage users   │       └─ Can view own claims│
          Can assign claims   │         Can't do admin     │
          Can process queue   │         tasks              │
        └─────────────────────┘       └─────────────────────┘
```

---

## 📊 Data Flow Diagram - Claims Assignment

```
┌─────────────────────────────────────────────────────────────────┐
│                 Superadmin Assigns Claims to User                │
└─────────────────────────────────────────────────────────────────┘

Step 1: Set User's Claim Limit
┌──────────────────────────────────────┐
│ Admin Panel → Claims Assignment Tab  │
│ User: john@gmail.com                 │
│ Claim Limit: 5                       │
│ POST /api/claims/[userId]            │
│ {                                    │
│   action: 'setLimit',                │
│   limit: 5                           │
│ }                                    │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  user_claim_limits   │
        │  table created/updated│
        │  user_id: xxx        │
        │  claim_limit: 5      │
        └──────────────────────┘

Step 2: Assign Claims (Exceeding Limit)
┌──────────────────────────────────────┐
│ Admin Panel → Claims Assignment Tab  │
│ User: john@gmail.com                 │
│ Claims: [id1, id2, id3, id4, id5,   │
│          id6, id7, id8]              │
│ POST /api/claims/[userId]            │
│ {                                    │
│   action: 'assign',                  │
│   claimIds: [...]                    │
│ }                                    │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────────┐    ┌────────────┐
   │ Backend     │    │ Service    │
   │ Processes:  │    │ Layer      │
   │             │    │ Validation │
   │ Check       │    └────────────┘
   │ Limit (5)   │
   │ Get Current │    ┌────────────────────┐
   │ Load (0)    │    │ Available Slots: 5 │
   │             │    └────────────────────┘
   └─────────────┘
        │
        ▼
   ┌──────────────────────────────┐
   │ Assign 5 claims              │
   │ Queue 3 claims               │
   └──────────────────────────────┘
        │
   ┌────┴────┬─────────┐
   ▼         ▼         ▼
┌─────┐  ┌─────┐  ┌──────┐
│ id1 │  │ id2 │  │ id3  │  → claim_assignments
│ id4 │  │ id5 │      .
└─────┘  └─────┘      .
                     │id6│  → claim_queue
                     │id7│     (FIFO order)
                     │id8│
                     └───┘

Step 3: User Views Assigned Claims
┌──────────────────────────────────────────────────────┐
│ User Login → Projects → Project → Claims Tab         │
│ /api/projects/[id]/assigned-jobs                    │
│ [Backend filters by user's assigned claim IDs]      │
│                                                     │
│ Returns: [id1, id2, id3, id4, id5]                 │
│ (Only 5 - not the queued ones yet)                 │
└──────────────────────────────────────────────────────┘

Step 4: User Releases a Claim
┌──────────────────────────────────────────────────────┐
│ User marks claim complete/releases it                │
│ DELETE /api/claims/[userId]?claimId=id2            │
│                                                     │
│ Backend:                                            │
│ 1. Remove claim_assignment for id2                 │
│ 2. Check claim_queue                               │
│ 3. Move id6 from queue to assignments             │
│ 4. Update counts                                   │
└──────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ User's New Load:                        │
│ ├─ Assigned: [id1, id3, id4, id5, id6] │
│ └─ Queued: [id7, id8]                  │
└─────────────────────────────────────────┘
```

---

## 🔄 Authentication & Authorization Flow

```
┌─────────────────────────────────────────┐
│   1. User Submits Login Form            │
│   ├─ email: user@gmail.com              │
│   └─ password: xxxxxxxx                 │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────┐
    │ 2. POST /api/auth/login     │
    │    ├─ Find user in DB       │
    │    ├─ Verify password hash  │
    │    ├─ Check isActive status │
    │    └─ Generate JWT token    │
    └──────────────┬──────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ✅ Success             ❌ Failed
   │                      │
   ├─ Token: eyJhb...     └─ 401 Unauthorized
   ├─ role: 'superadmin'
   ├─ userId: xxxx
   ├─ email: admin@...
   └─ iat/exp: ...
        │
        ▼
   ┌──────────────────────────────┐
   │ 3. Frontend stores token     │
   │    (localStorage/cookie)     │
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌────────────────────────────────────┐
   │ 4. All subsequent requests         │
   │    Authorization: Bearer <token>   │
   └──────────────┬─────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────────┐
   │ 5. Backend verifies token          │
   │    ├─ Decode JWT                   │
   │    ├─ Extract role                 │
   │    ├─ Check permissions            │
   │    └─ Allow/Deny action            │
   └────────────────────────────────────┘
```

---

## 🗄️ Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                      USERS COLLECTION                            │
│                                                                  │
│  Document:                                                      │
│  {                                                              │
│    _id: ObjectId("..."),                                       │
│    email: "john@gmail.com",                                    │
│    password: "$2b$10$hashed...",                               │
│    role: "superadmin" | "user",                               │
│    isActive: true,                                            │
│    created_at: ISODate(...),                                  │
│    updated_at: ISODate(...)                                   │
│  }                                                              │
│                                                                  │
└──────────────┬─────────────────────────────────────────────────┘
               │ references
               │ (via _id)
        ┌──────┴──────┬──────────┬──────────┐
        ▼             ▼          ▼          ▼
┌──────────────────────────────────────┐  ┌──────────────────┐
│   USER_CLAIM_LIMITS COLLECTION      │  │  CLAIM_ASSIGNMENTS│
│ {                                    │  │  {               │
│   user_id: ObjectId("..."),         │  │    user_id: ..., │
│   claim_limit: 5                     │  │    claim_id: ...,│
│ }                                    │  │    assigned_at:..│
│                                      │  │  }               │
└──────────────────────────────────────┘  └──────────────────┘
        │ (one per user)                        │ (many per user)
        │                                       │
        └───────────────────────────┬───────────┘
                                    ▼
                        ┌──────────────────────┐
                        │  CLAIM_QUEUE         │
                        │  {                   │
                        │    user_id: ...,     │
                        │    claim_id: ...,    │
                        │    queued_at: ...,   │
                        │    priority: 1       │
                        │  }                   │
                        │  (FIFO processing)   │
                        └──────────────────────┘
```

---

## 🚀 Request/Response Examples

### Example 1: Admin Listing Users

```
REQUEST:
GET /api/users HTTP/1.1
Authorization: Bearer eyJhbGc...

RESPONSE (200 OK):
{
  "users": [
    {
      "email": "admin@gmail.com",
      "role": "superadmin",
      "isActive": true,
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "email": "user1@gmail.com",
      "role": "user",
      "isActive": true,
      "created_at": "2024-01-16T14:30:00Z"
    }
  ]
}
```

### Example 2: Superadmin Viewing All Jobs

```
REQUEST:
GET /api/projects/60d5ec49c1234567890abcde/jobs?page=1&limit=10
Authorization: Bearer <superadmin-token>

RESPONSE (200 OK):
{
  "jobs": [
    {
      "_id": "60d5ec49...",
      "project_id": "...",
      "status": "completed",
      "city": "New York",
      ...
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Example 3: Regular User Viewing Assigned Jobs

```
REQUEST:
GET /api/projects/60d5ec49c1234567890abcde/assigned-jobs
Authorization: Bearer <user-token>

RESPONSE (200 OK):
{
  "jobs": [
    {
      "_id": "60d5ec49...",  ← Only claims assigned to this user
      "project_id": "...",
      "status": "pending",
      ...
    },
    ...
  ],
  "pagination": { ... }
}
```

---

## 🎯 Feature Comparison Matrix

| Feature | Superadmin | Regular User |
|---------|-----------|-------------|
| View all users | ✅ | ❌ |
| Modify user roles | ✅ | ❌ |
| View all claims | ✅ | ❌ |
| View own claims | ✅ | ✅ |
| Assign claims | ✅ | ❌ |
| Set claim limits | ✅ | ❌ |
| Process queue | ✅ | ❌ |
| Access admin page | ✅ | ❌ |
| Release own claims | ✅ | ✅ |
| View queue status | ✅ | ❌ (own queue) |

---

## 📱 Frontend State Management

```
ProjectDashboard Component State:
├─ isSuperadmin (boolean)
│  └─ Determines if Admin button shown
│
├─ isLoading (boolean)
│  └─ Show loading spinner while fetching role

ClaimsTable Component State:
├─ isSuperadmin (boolean)
│  └─ Determines endpoint used
├─ jobs (array)
│  └─ Populated from correct endpoint
├─ pagination (object)
│  └─ Tracks page/limit
└─ loading (boolean)
   └─ Show spinner while fetching

Admin Page State (via components):
├─ Users Management
│  ├─ allUsers (array)
│  ├─ selectedUser (object)
│  └─ loading (boolean)
│
├─ Claims Assignment
│  ├─ users (array)
│  ├─ selectedUser (object)
│  ├─ claimIds (string)
│  ├─ queuedClaims (array)
│  └─ loading (boolean)
```

---

## ✨ Complete System Status

🟢 **FULLY IMPLEMENTED AND INTEGRATED**

- ✅ Role-based authentication
- ✅ User management API
- ✅ Claims assignment with auto-queuing
- ✅ Frontend role detection
- ✅ Conditional endpoint routing
- ✅ Admin dashboard with UI
- ✅ Claims filtering by user
- ✅ Queue management
- ✅ Real-time updates
- ✅ Comprehensive error handling

---

**Ready for Testing and Deployment!** 🚀
