# Quick Reference - User Management System

## For Administrators

### Initial Setup

1. **Create first superadmin:**
   ```bash
   node create-superadmin.js
   ```

2. **Migrate existing users:**
   ```bash
   node migrate-users.js
   ```

3. **Access Admin Panel:**
   - Login as superadmin
   - Go to `/admin`

### Managing Users

**Add New User:**
1. Go to `/admin` → "Users Management"
2. (Currently done via API or create-superadmin script)
3. Users can also self-register via `/login`

**Change User Role:**
1. Go to `/admin` → "Users Management"
2. Find the user
3. Click "Change Role"
4. Select new role (superadmin or user)
5. Click "Update"

**Activate/Deactivate User:**
1. Go to `/admin` → "Users Management"
2. Find the user
3. Click "Deactivate" to disable access
4. Click "Activate" to re-enable

### Managing Claims

**Set Claim Limit:**
1. Go to `/admin` → "Claims Assignment"
2. Find user
3. Click "Manage"
4. Enter claim limit (e.g., 10)
5. Click "Set Limit"

**Assign Claims:**
1. Go to `/admin` → "Claims Assignment"
2. Find user
3. Click "Manage"
4. Paste claim IDs (one per line)
5. Click "Assign Claims"
   - Claims assigned immediately if user has capacity
   - Claims queued if user at capacity

**Process Queue:**
1. Go to `/admin` → "Claims Assignment"
2. If queued claims exist, click "Process Queue"
3. System will auto-assign to users with available capacity

**View Queue Status:**
- Badge shows number of queued claims
- Click "Queued Claims" to see details

## For Regular Users

### Viewing Assigned Jobs

1. Login as regular user
2. Go to Projects
3. Select a project
4. You will only see jobs/claims assigned to you
5. Search and filter as normal

### What You Cannot Do

- Access `/admin` page
- Manage other users
- Assign claims
- View other users' assignments

## API Quick Reference

### Authentication
All API calls require valid JWT token in `auth-token` cookie

### List Users (Superadmin)
```bash
GET /api/users
```

### Update User (Superadmin)
```bash
PUT /api/users
Body: {
  "userId": "user_id",
  "role": "superadmin" | "user",
  "isActive": true | false
}
```

### Create User (Superadmin)
```bash
POST /api/users/create
Body: {
  "email": "user@example.com",
  "password": "password",
  "role": "user" | "superadmin"
}
```

### Get User Claims Load (Own or Superadmin)
```bash
GET /api/claims/{userId}?action=load
```

### Get User Assigned Claims (Own or Superadmin)
```bash
GET /api/claims/{userId}?action=assigned
```

### Set Claim Limit (Superadmin)
```bash
POST /api/claims/{userId}
Body: {
  "action": "setLimit",
  "limit": 10
}
```

### Assign Claims (Superadmin)
```bash
POST /api/claims/{userId}
Body: {
  "action": "assign",
  "claimIds": ["id1", "id2", "id3"]
}
```

### Process Queue (Superadmin)
```bash
POST /api/claims/queue
Body: {
  "action": "processQueue"
}
```

### Release Claim (Superadmin)
```bash
DELETE /api/claims/{userId}?claimId=claim_id
```

### Get Assigned Jobs (Any User)
```bash
GET /api/projects/{projectId}/assigned-jobs?page=1&limit=10&search=query
```

## Common Tasks

### Scenario 1: Add new user and assign claims

```bash
# 1. Create user via API
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -b "auth-token=<superadmin_token>" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'

# 2. Set claim limit
curl -X POST http://localhost:3000/api/claims/{userId} \
  -H "Content-Type: application/json" \
  -b "auth-token=<superadmin_token>" \
  -d '{
    "action": "setLimit",
    "limit": 5
  }'

# 3. Assign claims
curl -X POST http://localhost:3000/api/claims/{userId} \
  -H "Content-Type: application/json" \
  -b "auth-token=<superadmin_token>" \
  -d '{
    "action": "assign",
    "claimIds": ["claim1", "claim2", "claim3"]
  }'
```

### Scenario 2: Balance workload

1. Go to `/admin` → "Claims Assignment"
2. Look for users with high load (red bars)
3. Look for users with available capacity (green bars)
4. Reassign claims from high-load users to available users

### Scenario 3: Handle queued claims

1. Go to `/admin` → "Claims Assignment"
2. If queue badge shows claims in queue:
   - Wait for users to release claims
   - OR manually reassign claims from users
   - OR click "Process Queue" to auto-assign

## Troubleshooting

### "Forbidden" error when accessing /admin
- Ensure you're logged in as superadmin
- Check user role in MongoDB: `db.users.findOne({email: "your-email"})`
- Should have `role: "superadmin"`

### Claims not showing for user
- Check if claims are assigned: `db.claim_assignments.find({userId: "user_id"})`
- Verify claim IDs are correct (24-char MongoDB ObjectId)
- Check if user role is "superadmin" (superadmins see all claims)

### Cannot access jobs
- Ensure you're logged in as regular user
- Check if claims are assigned to you
- Verify jobs collection has matching claim IDs

## Files Reference

| File | Purpose |
|------|---------|
| `lib/userService.ts` | User CRUD operations |
| `lib/claimsService.ts` | Claims assignment & queue logic |
| `lib/auth.ts` | Authentication & JWT tokens |
| `app/api/users/route.ts` | User management API |
| `app/api/users/create/route.ts` | User creation API |
| `app/api/claims/[userId]/route.ts` | Claims assignment API |
| `app/admin/page.tsx` | Admin dashboard page |
| `components/dashboard/users-management.tsx` | Users UI component |
| `components/dashboard/claims-assignment.tsx` | Claims assignment UI |
| `create-superadmin.js` | Create superadmin utility |
| `migrate-users.js` | Database migration script |

## Environment Variables

Required in `.env.local`:
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=admin
JWT_SECRET=your-secret-key
NODE_ENV=development|production
```

## Support

For issues or questions, refer to `USER_MANAGEMENT_README.md` for detailed documentation.
