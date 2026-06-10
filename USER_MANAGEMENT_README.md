# User Management & Claims Assignment System

This document describes the new user management and claims assignment features added to the Medsense Comparison platform.

## Overview

The system now supports:
1. **Role-Based Access Control** - Users can have roles (superadmin, user)
2. **User Management** - Create, update, and manage users with different roles
3. **Jobs Assignment** - Users see only their assigned jobs
4. **Claims Assignment** - Superadmins can assign claims to users with customizable limits and automatic queue processing

## Database Schema

### Users Collection
Extended with new fields:

```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  role: 'superadmin' | 'user',      // NEW: Role-based access
  isActive: boolean,                  // NEW: User activation status
  created_at: Date,
  updated_at: Date                    // NEW: Track updates
}
```

### New Collections

#### claim_assignments
Tracks which user has been assigned which claim:

```javascript
{
  _id: ObjectId,
  claimId: string,                    // ID of the claim
  userId: string,                     // ID of assigned user
  assignedAt: Date,
  status: 'assigned' | 'in_queue'
}
```

#### user_claim_limits
Stores the claim limit for each user:

```javascript
{
  _id: ObjectId,
  userId: string,
  claimLimit: number,                 // Max claims per user
  updatedAt: Date
}
```

#### claim_queue
Queue for claims waiting to be assigned:

```javascript
{
  _id: ObjectId,
  claimId: string,
  createdAt: Date,
  processed: boolean                  // Marked when assigned
}
```

## API Endpoints

### User Management

#### GET /api/users
List all users (superadmin only)

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "email": "user@example.com",
      "role": "user",
      "isActive": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### PUT /api/users
Update user role or active status (superadmin only)

**Request:**
```json
{
  "userId": "user_id",
  "role": "superadmin"  // or "user"
  // OR
  "isActive": true  // or false
}
```

#### POST /api/users/create
Create a new user (superadmin only)

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"  // optional, defaults to "user"
}
```

### Claims Assignment

#### GET /api/claims/[userId]
Get user's claims load and limits

**Query Parameters:**
- `action`: 'load' | 'assigned' | 'queue'
- `userId`: The user ID

**Response (action=load):**
```json
{
  "userId": "user_id",
  "assignedClaimsCount": 5,
  "claimLimit": 10
}
```

**Response (action=assigned):**
```json
{
  "claims": ["claim_id_1", "claim_id_2", "claim_id_3"]
}
```

#### POST /api/claims/[userId]
Assign claims to user or set limit (superadmin only)

**Request (set limit):**
```json
{
  "action": "setLimit",
  "limit": 10
}
```

**Request (assign claims):**
```json
{
  "action": "assign",
  "claimIds": ["claim_1", "claim_2", "claim_3"]
}
```

**Response:**
```json
{
  "assigned": ["claim_1", "claim_2"],
  "queued": ["claim_3"]  // Queued if user at capacity
}
```

#### POST /api/claims/queue
Process the claim queue (superadmin only)

**Request:**
```json
{
  "action": "processQueue"
}
```

**Response:**
```json
{
  "ok": true,
  "remainingInQueue": 0
}
```

#### DELETE /api/claims/[userId]?claimId=claim_id
Release a claim from user (superadmin only)

### Jobs Filtering

#### GET /api/projects/[projectId]/assigned-jobs
Get jobs assigned to current user

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term

**Response:**
```json
{
  "jobs": [
    {
      "_id": "job_id",
      "parsed_data": {...},
      "status": "completed",
      ...
    }
  ],
  "counts": {
    "pending": 5,
    "processing": 2,
    "completed": 15,
    "failed": 0,
    "total": 22
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 22,
    "pages": 3
  }
}
```

## User Interface

### Admin Page (`/admin`)

Access: Superadmin only

#### Users Management Tab
- View all users with their roles and status
- Change user role (superadmin ↔ user)
- Activate/Deactivate users

#### Claims Assignment Tab
- View all active users and their claims load
- Set claim limit per user
- Assign claims in bulk
- View claim queue status
- Process claim queue manually

## Features

### 1. Role-Based Access Control

**Superadmin**
- Access all features
- Manage all users
- Assign/manage all claims
- See all jobs

**User**
- Can only see their assigned jobs
- Cannot manage other users
- Cannot assign claims

### 2. Claims Assignment Workflow

1. **Set Claim Limit**: Superadmin sets maximum claims per user
2. **Assign Claims**: 
   - If user has capacity: claim assigned immediately
   - If user at capacity: claim added to queue
3. **Automatic Queue Processing**:
   - When user releases a claim
   - Manual queue processing triggered by superadmin
   - Queue respects FIFO ordering

### 3. Load Balancing

Visual indicators for user workload:
- Green (0-50%): Low load
- Yellow (50-75%): Medium load
- Red (75-100%): High/Full capacity

## Setup Instructions

### 1. Migration

Run the migration script to add roles to existing users:

```bash
node migrate-users.js
```

This will:
- Add `role: 'user'` to all users without a role
- Add `isActive: true` to all users without this field
- Create necessary indexes

### 2. First Time Setup

1. First user should register normally (will get role: 'user')
2. Manually update first user to superadmin:

```bash
# Using MongoDB CLI or your preferred client
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "superadmin" } }
)
```

### 3. Start Using

1. Go to `/admin` (superadmin only)
2. Go to "Users Management" tab to manage users
3. Go to "Claims Assignment" tab to assign claims

## Implementation Details

### Services

#### userService.ts
Functions for user operations:
- `createUser()` - Create new user
- `getUserById()` - Get user details
- `updateUserRole()` - Change user role
- `toggleUserActive()` - Activate/deactivate user
- `getAllUsers()` - List all users

#### claimsService.ts
Functions for claims assignment:
- `setUserClaimLimit()` - Set max claims for user
- `assignClaimsToUser()` - Assign claims with queue logic
- `getUserClaimsLoad()` - Get user's current load
- `getUserAssignedClaims()` - Get all claims for user
- `releaseClaimFromUser()` - Release claim and process queue
- `processClaimQueue()` - Process queued claims
- `getQueuedClaims()` - List queued claims

### Components

#### UsersManagement.tsx
React component for managing users:
- Display all users in a table
- Change roles via dialog
- Activate/deactivate users
- Real-time updates

#### ClaimsAssignment.tsx
React component for claims assignment:
- Display all users with load status
- Set claim limits
- Assign claims in bulk
- Process queue
- Visual load indicators

### Pages

#### /admin
Main administration page with tabs for:
- Users Management
- Claims Assignment

## Security

- All endpoints require authentication (JWT token)
- User/Claim modification restricted to superadmin
- Users can only view their own data
- Passwords are hashed using bcrypt

## Error Handling

API returns standard HTTP status codes:
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate)
- `500` - Server error

## Future Enhancements

- Bulk user import via CSV
- User activity audit logs
- Automatic queue processing intervals
- Claims reassignment rules
- User workload analytics
- Email notifications for claim assignments

## Troubleshooting

### Users not showing in admin page
- Ensure user is logged in as superadmin
- Check that users have `isActive: true`
- Run migration script if users don't have role field

### Claims not assigning correctly
- Verify claim IDs are correct (24-char MongoDB ObjectId)
- Check that user claim limit is set
- Review queue status and process if needed

### User can see all jobs
- Check that user role is not "superadmin"
- Verify claims are assigned to user
- Check that job IDs match claim IDs in assignment collection

## Database Queries

### Find all superadmins
```javascript
db.users.find({ role: "superadmin" })
```

### Find users at capacity
```javascript
db.users.aggregate([
  {
    $lookup: {
      from: "user_claim_limits",
      localField: "_id",
      foreignField: "userId",
      as: "limits"
    }
  },
  {
    $lookup: {
      from: "claim_assignments",
      localField: "_id",
      foreignField: "userId",
      as: "assignments"
    }
  },
  {
    $match: {
      "$expr": {
        "$gte": [
          { "$size": "$assignments" },
          { "$arrayElemAt": ["$limits.claimLimit", 0] }
        ]
      }
    }
  }
])
```

### Count queued claims
```javascript
db.claim_queue.countDocuments({ processed: false })
```

### Get user workload report
```javascript
db.user_claim_limits.aggregate([
  {
    $lookup: {
      from: "claim_assignments",
      localField: "userId",
      foreignField: "userId",
      as: "claims"
    }
  },
  {
    $project: {
      email: 1,
      claimLimit: 1,
      assignedCount: { $size: "$claims" },
      percentageUsed: {
        $multiply: [
          { $divide: [{ $size: "$claims" }, "$claimLimit"] },
          100
        ]
      }
    }
  }
])
```
