# Staff Management System Smoke Test Guide

This document provides a step-by-step guide for manually testing the staff management system enhancements.

## Prerequisites
- Django development server running
- At least one superuser account
- At least one staff account with different roles (admin, moderator, support, viewer)
- At least one coach account
- At least one client account

## Test Cases

### 1. Staff Page Access Restrictions

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Non-staff user tries to access staff page | 1. Login as client/coach user<br>2. Try to access any staff page URL directly | Should be redirected to dashboard with 403 error message | □ |
| Staff user accesses staff page | 1. Login as staff user<br>2. Access any staff page URL | Should be able to access the page successfully | □ |
| Logged out user tries to access staff page | 1. Ensure you're logged out<br>2. Try to access any staff page URL | Should be redirected to login page | □ |

### 2. User Blocking Functionality

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Block user with reason | 1. Login as staff with moderator+ role<br>2. Go to Users management page<br>3. Click Block button for a user<br>4. Enter a reason and confirm | User should be blocked and reason stored | □ |
| Block reason required | 1. Login as staff with moderator+ role<br>2. Try to block a user with empty reason | System should prevent blocking and show error | □ |
| Lower permission staff can't block higher | 1. Login as staff with lower role<br>2. Try to block staff user with higher role | Action should be prevented with permission error | □ |
| Unblock user | 1. Login as staff with moderator+ role<br>2. Unblock a previously blocked user | User should be unblocked and block reason cleared | □ |
| Blocked user login attempt | 1. Login using blocked user credentials | Should see block notification with reason and block date | □ |
| Blocked user access attempt | 1. Try to access protected page as blocked user | Should be redirected to block notification page | □ |

### 3. User Type Changing

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Change user type | 1. Login as admin staff<br>2. Change user type of a normal user<br>3. Select new type from dropdown | User type should change successfully | □ |
| Change user type with staff role | 1. Login as admin staff<br>2. Change a user to staff type<br>3. Select staff role | Both user type and staff role should update | □ |
| Lower permission staff can't change higher | 1. Login as lower role staff<br>2. Try to change type of higher role staff | Action should be prevented with permission error | □ |
| Invalid user type validation | 1. Try to submit invalid user type (if possible) | System should validate and prevent change | □ |

### 4. Staff Role Permissions

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Viewer role access | 1. Login as viewer staff<br>2. Try to view users and coaches lists | Should be able to view but not modify | □ |
| Support role actions | 1. Login as support staff<br>2. Try to perform standard support actions | Should succeed for appropriate actions | □ |
| Moderator role actions | 1. Login as moderator<br>2. Try to block/unblock users<br>3. Try to approve/reject coaches | Should succeed for appropriate actions | □ |
| Admin role actions | 1. Login as admin<br>2. Try to change user types and roles | Should succeed for all admin actions | □ |
| Permission boundary tests | 1. Login as each role<br>2. Try actions just above permission level | Should be denied with appropriate message | □ |

## How to Report Issues

For each failed test:
1. Note the specific test case that failed
2. Document the actual behavior observed
3. Include any error messages displayed
4. If possible, capture screenshots of the issue
5. Note the browser and device used for testing

## Testing Completion

- Complete Date: ________________
- Tester: ________________________
- All Tests Passed: □ Yes □ No
- Issues Found: __________ (number)
