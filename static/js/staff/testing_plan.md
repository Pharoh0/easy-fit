# Staff Module Testing Plan

## Overview
This document outlines the testing plan for the Staff Module in Eazy Fit. The plan covers testing all frontend components that interact with the Staff API endpoints.

## Test Environment Setup
1. Ensure the Django server is running with `python manage.py runserver`
2. Activate the virtual environment with `source venv/Scripts/activate` on Windows
3. Login as a staff user to access the Staff Module

## Dashboard Testing

### Dashboard Metrics
- **Test ID**: DASH-01
- **Description**: Verify dashboard metrics API returns correct data structure and values
- **Steps**:
  1. Open browser console and navigate to the staff dashboard
  2. Check console logs for the dashboard metrics API response
  3. Verify metrics data structure matches expected format (users, approvals, plans)
  4. Confirm that all stat counters are populated with the correct values
  5. Confirm that charts are rendered properly

### Charts
- **Test ID**: DASH-02
- **Description**: Verify charts display correct data from API
- **Steps**:
  1. Check user roles chart displays correct distribution of clients/coaches/staff
  2. Check plans overview chart displays correct counts for plan requests and subscriptions by status

## Users Management Testing

### Users Listing
- **Test ID**: USR-01
- **Description**: Verify users list loads correctly with server-side processing
- **Steps**:
  1. Navigate to the users management page
  2. Check console logs for API requests and responses
  3. Verify DataTable shows users with correct pagination
  4. Test search functionality works as expected

### Filtering
- **Test ID**: USR-02
- **Description**: Verify user filters work correctly
- **Steps**:
  1. Test each filter option (User Type, Active, Enabled, Whitelisted)
  2. Verify that filter combinations work correctly
  3. Check that DataTable reloads with filtered data

### User Actions
- **Test ID**: USR-03
- **Description**: Verify user action buttons work correctly
- **Steps**:
  1. Test block/unblock functionality for a test user
  2. Test changing user type functionality
  3. Verify confirmation prompts appear and work correctly
  4. Verify that DataTable refreshes after successful actions

## Coaches Management Testing

### Coaches Listing
- **Test ID**: COACH-01
- **Description**: Verify coaches list loads correctly with server-side processing
- **Steps**:
  1. Navigate to the coaches management page
  2. Check console logs for API requests and responses
  3. Verify DataTable shows coaches with correct pagination
  4. Test search functionality works as expected

### Filtering
- **Test ID**: COACH-02
- **Description**: Verify coach filters work correctly
- **Steps**:
  1. Test each filter option (Approval Status, Active)
  2. Verify that filter combinations work correctly
  3. Check that DataTable reloads with filtered data

### Coach Actions
- **Test ID**: COACH-03
- **Description**: Verify coach approval/rejection actions work correctly
- **Steps**:
  1. Test approving a coach profile with and without enabling user
  2. Test rejecting a coach profile with notes
  3. Verify confirmation prompts appear and work correctly
  4. Verify that DataTable refreshes after successful actions

## Certifications Management Testing

### Certifications Listing
- **Test ID**: CERT-01
- **Description**: Verify certifications list loads correctly with server-side processing
- **Steps**:
  1. Navigate to the certifications management page
  2. Check console logs for API requests and responses
  3. Verify DataTable shows certifications with correct pagination
  4. Test search functionality works as expected

### Filtering
- **Test ID**: CERT-02
- **Description**: Verify certification filters work correctly
- **Steps**:
  1. Test status filter options (Pending, Approved, Rejected)
  2. Check that DataTable reloads with filtered data

### Certification Actions
- **Test ID**: CERT-03
- **Description**: Verify certification approval/rejection actions work correctly
- **Steps**:
  1. Test approving a certification with optional notes
  2. Test rejecting a certification with required notes
  3. Verify confirmation prompts appear and work correctly
  4. Verify that DataTable refreshes after successful actions
  5. Check that file previews work correctly

## Error Handling Testing

### API Error Handling
- **Test ID**: ERR-01
- **Description**: Verify error handling for API failures
- **Steps**:
  1. Simulate API errors (can be done by temporarily modifying API endpoints)
  2. Verify that appropriate error messages are displayed
  3. Check that toast notifications show correct error messages
  4. Verify that UI remains functional after errors

### Validation
- **Test ID**: ERR-02
- **Description**: Verify input validation for forms and prompts
- **Steps**:
  1. Test validation for notes input in approval/rejection forms
  2. Verify that required fields cannot be submitted empty
  3. Test with various input formats to ensure proper validation

## Performance Testing

### Pagination
- **Test ID**: PERF-01
- **Description**: Verify performance with large datasets
- **Steps**:
  1. Test with larger page sizes (50, 100 items)
  2. Monitor network requests and response times
  3. Check browser memory usage and performance

### Chart Rendering
- **Test ID**: PERF-02
- **Description**: Verify chart rendering performance
- **Steps**:
  1. Monitor rendering time for dashboard charts
  2. Test chart redraws when data changes

## Cross-Browser Testing

### Browser Compatibility
- **Test ID**: COMP-01
- **Description**: Verify functionality across browsers
- **Steps**:
  1. Test on Chrome, Firefox, Edge
  2. Verify all features work consistently across browsers

## Bug Reporting Template

For any issues found during testing, please use the following template:

```
Bug ID: [Auto-increment]
Test ID: [Related test ID]
Title: [Brief description]
Severity: [Critical/High/Medium/Low]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
...
Expected Result: [What should happen]
Actual Result: [What actually happened]
Screenshots/Console Logs: [If applicable]
```
