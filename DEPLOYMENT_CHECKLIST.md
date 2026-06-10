# Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment

### Code Review
- [ ] All TypeScript compilation passes (no errors)
- [ ] All API endpoints tested locally
- [ ] All components render without errors
- [ ] No console warnings or errors
- [ ] Git commits are clean and descriptive

### Database
- [ ] MongoDB connection string verified
- [ ] Database backups created
- [ ] Indexes will be created automatically
- [ ] Enough disk space for new collections
- [ ] Connection pooling configured if needed

### Environment
- [ ] `.env.production` configured with production credentials
- [ ] `JWT_SECRET` set to strong random value
- [ ] `MONGODB_URI` points to production database
- [ ] `MONGODB_DB_NAME` set to production database name
- [ ] `NODE_ENV=production`

### Security
- [ ] HTTPS/SSL enabled
- [ ] CORS configured properly
- [ ] JWT token expiration set appropriately (currently 24h)
- [ ] Password hashing working correctly
- [ ] No sensitive data in code or logs

## Deployment

### Build
- [ ] Run `npm run build` - builds without errors
- [ ] Static assets generated
- [ ] API routes compiled
- [ ] Components bundled correctly

### Database Migration
- [ ] Backup current database
- [ ] Run migration script: `node migrate-users.js`
- [ ] Verify all users have role and isActive fields
- [ ] Check indexes created on:
  - `claim_assignments.claimId`
  - `claim_assignments.userId`
  - `claim_assignments.status`
  - `user_claim_limits.userId`
  - `claim_queue.claimId`
  - `claim_queue.createdAt`

### Initial Setup
- [ ] Create first superadmin user: `node create-superadmin.js`
- [ ] Test login as superadmin
- [ ] Access `/admin` page successfully
- [ ] Create a test user
- [ ] Verify test user cannot access `/admin`

### Verification
- [ ] All API endpoints accessible
- [ ] Authentication working
- [ ] Regular users see only assigned jobs
- [ ] Superadmins see all jobs
- [ ] Claims assignment working
- [ ] Queue processing working
- [ ] User role changes working

## Post-Deployment

### Testing
- [ ] Run full test suite
- [ ] Test all user flows:
  - [ ] Superadmin login
  - [ ] User creation
  - [ ] Role changes
  - [ ] Claims assignment
  - [ ] Queue processing
  - [ ] Regular user login and job view
- [ ] Check error handling
- [ ] Monitor error logs

### Monitoring
- [ ] Set up error logging (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Monitor database performance
- [ ] Check API response times
- [ ] Monitor queue processing times

### Documentation
- [ ] Deploy `USER_MANAGEMENT_README.md` to docs site
- [ ] Provide `ADMIN_QUICK_REFERENCE.md` to admin team
- [ ] Share `API_TESTING_GUIDE.md` for QA
- [ ] Document superadmin password in secure location
- [ ] Document any custom configurations

### Rollout
- [ ] Notify users of new features
- [ ] Train admin team on /admin page
- [ ] Provide documentation to support team
- [ ] Set up support channel for questions

## Rollback Plan

If issues occur during deployment:

### Quick Rollback
1. Restore database from backup
2. Revert code to previous version
3. Clear caches if applicable
4. Verify system working

### Partial Rollback
- If only UI has issues: revert frontend code
- If only API has issues: revert API endpoints
- If database issues: restore from backup

### Communication
- [ ] Notify team of rollback
- [ ] Document what went wrong
- [ ] Plan fix before next deployment attempt

## Checklist for Each Deployment

Before deploying any updates:

- [ ] Latest code committed to main branch
- [ ] All tests passing
- [ ] Database changes backed up
- [ ] Deployment window scheduled
- [ ] Rollback plan documented
- [ ] Team notified of maintenance window
- [ ] Monitoring set up for new code

## Database Backup Strategy

### Before Deployment
```bash
# Full backup
mongodump --uri="mongodb://..." --out=./backup_production_$(date +%Y%m%d)
```

### Regular Backups (Production)
- Daily backups recommended
- Keep 7 days of daily backups
- Monthly archive for compliance

### Restore from Backup
```bash
# Restore specific database
mongorestore --uri="mongodb://..." --db=admin ./backup_dir/admin
```

## Monitoring Dashboard

Track these metrics post-deployment:

### Performance
- API response times (target: < 200ms)
- Database query times (target: < 100ms)
- Queue processing time (target: < 5s)

### Usage
- Active users
- Claims assigned per day
- Queue depth
- Average claims per user

### Errors
- Failed API requests
- Database errors
- Authentication failures
- Processing errors

## Support Contacts

- **DBA**: Database questions, backups, restoration
- **DevOps**: Deployment, monitoring, infrastructure
- **Product**: Feature changes, user impact
- **Security**: Access control, data privacy

## Post-Deployment Review

After 24 hours of production deployment:

- [ ] No critical errors in logs
- [ ] Performance metrics normal
- [ ] Users reporting no issues
- [ ] Backups completed successfully
- [ ] Monitoring alerts configured
- [ ] Team briefing completed

After 1 week:

- [ ] All systems stable
- [ ] No performance degradation
- [ ] No security issues identified
- [ ] User feedback positive
- [ ] Ready for next deployment

## Sign-Off

Deployment completed by: ___________________
Date: ___________________
Verified by: ___________________
Date: ___________________

## Notes

Use this section to document any special steps or issues during deployment:

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
