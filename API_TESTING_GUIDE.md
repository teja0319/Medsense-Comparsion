# API Testing Examples

This file contains example curl commands and test cases for the User Management & Claims System APIs.

## Prerequisites

- Application running on `http://localhost:3000`
- Superadmin user created
- Logged in with superadmin account

## 1. User Management

### 1.1 List All Users

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "admin@example.com",
      "role": "superadmin",
      "isActive": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 1.2 Create New User

```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

Expected Response:
```json
{
  "ok": true,
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 1.3 Update User Role

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439012",
    "role": "superadmin"
  }'
```

Expected Response:
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "email": "john@example.com",
    "role": "superadmin",
    "isActive": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 1.4 Deactivate User

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439012",
    "isActive": false
  }'
```

## 2. Claims Management

### 2.1 Get User Claims Load

```bash
curl -X GET http://localhost:3000/api/claims/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "userId": "507f1f77bcf86cd799439012",
  "assignedClaimsCount": 3,
  "claimLimit": 10
}
```

### 2.2 Set Claim Limit

```bash
curl -X POST http://localhost:3000/api/claims/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "action": "setLimit",
    "limit": 5
  }'
```

Expected Response:
```json
{
  "ok": true,
  "limit": 5
}
```

### 2.3 Assign Claims to User

```bash
curl -X POST http://localhost:3000/api/claims/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "action": "assign",
    "claimIds": [
      "507f1f77bcf86cd799439020",
      "507f1f77bcf86cd799439021",
      "507f1f77bcf86cd799439022"
    ]
  }'
```

Expected Response:
```json
{
  "assigned": ["507f1f77bcf86cd799439020", "507f1f77bcf86cd799439021"],
  "queued": ["507f1f77bcf86cd799439022"]
}
```

### 2.4 Get Assigned Claims

```bash
curl -X GET "http://localhost:3000/api/claims/507f1f77bcf86cd799439012?action=assigned" \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "claims": [
    "507f1f77bcf86cd799439020",
    "507f1f77bcf86cd799439021"
  ]
}
```

### 2.5 Get Queued Claims

```bash
curl -X GET http://localhost:3000/api/claims/queue \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "queued": [
    "507f1f77bcf86cd799439022",
    "507f1f77bcf86cd799439023"
  ],
  "count": 2
}
```

### 2.6 Process Claim Queue

```bash
curl -X POST http://localhost:3000/api/claims/queue \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "ok": true,
  "message": "Queue processed",
  "remainingInQueue": 0
}
```

### 2.7 Release Claim from User

```bash
curl -X DELETE "http://localhost:3000/api/claims/507f1f77bcf86cd799439012?claimId=507f1f77bcf86cd799439020" \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "ok": true
}
```

## 3. Jobs Management

### 3.1 Get Assigned Jobs for Current User

```bash
curl -X GET "http://localhost:3000/api/projects/PROJECT_ID/assigned-jobs?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "jobs": [
    {
      "_id": "507f1f77bcf86cd799439030",
      "project_id": "PROJECT_ID",
      "status": "completed",
      "parsed_data": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "counts": {
    "pending": 2,
    "processing": 1,
    "completed": 5,
    "failed": 0,
    "total": 8
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "pages": 1
  }
}
```

### 3.2 Search Assigned Jobs

```bash
curl -X GET "http://localhost:3000/api/projects/PROJECT_ID/assigned-jobs?page=1&limit=10&search=claim123" \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN"
```

## 4. Error Cases

### 4.1 Unauthorized (No Token)

```bash
curl -X GET http://localhost:3000/api/users
```

Response (401):
```json
{
  "error": "Unauthorized"
}
```

### 4.2 Forbidden (Not Superadmin)

Request as regular user:
```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -b "auth-token=USER_JWT_TOKEN" \
  -d '{
    "email": "new@example.com",
    "password": "password123"
  }'
```

Response (403):
```json
{
  "error": "Forbidden"
}
```

### 4.3 User Already Exists

```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Response (409):
```json
{
  "error": "User already exists"
}
```

### 4.4 Invalid Role

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -b "auth-token=YOUR_JWT_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439012",
    "role": "invalid_role"
  }'
```

Response (400):
```json
{
  "error": "Invalid role"
}
```

## 5. Complete Workflow Example

### Step 1: List existing users
```bash
curl -X GET http://localhost:3000/api/users \
  -b "auth-token=$TOKEN"
```

### Step 2: Create new user
```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -b "auth-token=$TOKEN" \
  -d '{
    "email": "processor@example.com",
    "password": "pass123",
    "role": "user"
  }'
```

Store the USER_ID from response.

### Step 3: Set claim limit
```bash
curl -X POST http://localhost:3000/api/claims/$USER_ID \
  -H "Content-Type: application/json" \
  -b "auth-token=$TOKEN" \
  -d '{
    "action": "setLimit",
    "limit": 5
  }'
```

### Step 4: Assign claims
```bash
curl -X POST http://localhost:3000/api/claims/$USER_ID \
  -H "Content-Type: application/json" \
  -b "auth-token=$TOKEN" \
  -d '{
    "action": "assign",
    "claimIds": ["claim_1", "claim_2", "claim_3"]
  }'
```

### Step 5: Check user load
```bash
curl -X GET http://localhost:3000/api/claims/$USER_ID \
  -b "auth-token=$TOKEN"
```

### Step 6: Process queue if needed
```bash
curl -X POST http://localhost:3000/api/claims/queue \
  -H "Content-Type: application/json" \
  -b "auth-token=$TOKEN"
```

## Testing with JavaScript/Fetch

```javascript
// Get JWT token from cookies
const getToken = () => {
  const name = 'auth-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
};

const token = getToken();

// Example: List users
fetch('/api/users', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
})
  .then(res => res.json())
  .then(data => console.log(data));

// Example: Create user
fetch('/api/users/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
    role: 'user'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));

// Example: Set claim limit
fetch('/api/claims/USER_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'setLimit',
    limit: 10
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Notes

- Replace `YOUR_JWT_TOKEN` with actual token from login
- Replace `USER_ID` with actual MongoDB ObjectId
- Replace `PROJECT_ID` with actual project ID
- Replace `claim_X` with actual claim IDs
- All timestamps are in ISO 8601 format
- All IDs are MongoDB ObjectIds (24-character hex strings)
