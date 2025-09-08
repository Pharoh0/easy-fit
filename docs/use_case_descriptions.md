# Eazy Fit – Use Case Descriptions

This document contains structured use case specification tables derived from the functional requirements (REQ-001 – REQ-090). Use cases are grouped to cover all requirements with full traceability provided at the end.

Legend:
- Primary Actor(s): Main initiator(s)
- Supporting Actors: External systems, secondary roles
- Priority: 1 (Low) – 5 (Critical) based on highest linked requirement priority

---
## Styled Use Case Specification (HTML Format)

<style>
/* Black & White Printable Styling */
.usecase-table { border-collapse:collapse; width:100%; font-family:Arial, sans-serif; margin:28px 0; table-layout:fixed; }
.usecase-table th { background:#222; color:#fff; font-size:17px; padding:9px 11px; text-align:left; letter-spacing:.5px; }
.usecase-table td { border:1px solid #000; padding:7px 9px; vertical-align:top; font-size:13.5px; line-height:1.35; background:#fff; }
.usecase-table tr.alt-row td { background:#f2f2f2; }
.usecase-table td.heading-cell { background:#eee; font-weight:600; width:210px; }
.flow-arrows { width:40px; text-align:center; font-weight:bold; font-size:12px; letter-spacing:1px; }
.req-badge { border:1px solid #000; color:#000; padding:2px 5px; margin:2px 4px 2px 0; display:inline-block; border-radius:3px; font-size:10.5px; background:#fff; }
.mono { font-family:Consolas, monospace; font-size:12px; }
@media print { .usecase-table th { background:#000 !important; } }
</style>

> NOTE: Each table mirrors your requested layout (similar styling to provided screenshot) with clearly separated main and alternate flows.

### UC-001 – Register Account
<table class="usecase-table">
	<tr><th colspan="2">Use Case 1 – (UC-001) Register Account</th></tr>
	<tr><td><strong>Related Requirements</strong></td><td><span class="req-badge">REQ-001</span><span class="req-badge">REQ-002</span><span class="req-badge">REQ-025</span><span class="req-badge">REQ-069</span></td></tr>
	<tr><td><strong>Initiating Actor</strong></td><td>Visitor (Prospective Client / Coach)</td></tr>
	<tr><td><strong>Actor’s Goal</strong></td><td>Create a verified platform account</td></tr>
	<tr><td><strong>Participating Actors</strong></td><td>Email Service (verification)</td></tr>
	<tr><td><strong>Preconditions</strong></td><td>- User not authenticated<br>- Registration feature enabled</td></tr>
	<tr><td><strong>Post conditions</strong></td><td>- Account created in inactive state until email confirmation<br>- Audit log entry recorded</td></tr>
	<tr><td colspan="2"><strong>Flow of Events for main success scenario:</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8594;<br>&#8594;<br>&#8592;<br>&#8592;<br>&#8592;<br>&#8594;<br>&#8592;</td>
		<td>
			1. User opens registration page.<br>
			2. Selects role (Client / Coach).<br>
			3. Enters required data (email, password, minimal profile).<br>
			4. System validates password complexity & uniqueness of email.<br>
			5. System creates inactive account record.<br>
			6. System sends verification email with token.<br>
			7. User clicks verification link.<br>
			8. System activates account and establishes initial session.
		</td>
	</tr>
	<tr><td colspan="2"><strong>Flow of Events for Extensions (Alternate scenarios):</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8592;<br>&#8592;</td>
		<td>
			A1: Email already exists → System shows error and suggests login / reset.<br>
			A2: Weak password → System rejects and displays complexity rules.<br>
			A3: Verification token expired → User requests resend; system issues new token.<br>
			A4: Role selection invalid → System resets form with guidance.
		</td>
	</tr>
	<tr><td><strong>Priority</strong></td><td>5 (Critical)</td></tr>
</table>

### UC-002 – Login & Session Management
<table class="usecase-table">
	<tr><th colspan="2">Use Case 2 – (UC-002) Login & Session Management</th></tr>
	<tr><td><strong>Related Requirements</strong></td><td><span class="req-badge">REQ-001</span><span class="req-badge">REQ-002</span><span class="req-badge">REQ-027</span><span class="req-badge">REQ-025</span></td></tr>
	<tr><td><strong>Initiating Actor</strong></td><td>Registered User</td></tr>
	<tr><td><strong>Actor’s Goal</strong></td><td>Authenticate and start a secure session</td></tr>
	<tr><td><strong>Participating Actors</strong></td><td>Authentication Service; Session Manager</td></tr>
	<tr><td><strong>Preconditions</strong></td><td>- User account exists and (if required) verified<br>- User has valid credentials</td></tr>
	<tr><td><strong>Post conditions</strong></td><td>- Session created with role permissions<br>- Last login timestamp updated</td></tr>
	<tr><td colspan="2"><strong>Flow of Events for main success scenario:</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8594;<br>&#8592;<br>&#8592;<br>&#8592;<br>&#8592;</td>
		<td>
			1. User navigates to login page.<br>
			2. Enters username/email and password.<br>
			3. System validates credentials.<br>
			4. System creates authenticated session & assigns role-based permissions.<br>
			5. System records last login and audit entry.<br>
			6. User is redirected to personal dashboard.
		</td>
	</tr>
	<tr><td colspan="2"><strong>Flow of Events for Extensions (Alternate scenarios):</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8592;<br>&#8592;</td>
		<td>
			E1: Invalid credentials (≤ 3 attempts) → Show generic error; after threshold, throttle attempts.<br>
			E2: Account inactive / unverified → Provide reactivation or resend verification option.<br>
			E3: Session timeout → User prompted to re-login; unsaved data warning displayed.<br>
			E4: Password reset requested → Redirect to UC-023 flow.
		</td>
	</tr>
	<tr><td><strong>Priority</strong></td><td>5 (Critical)</td></tr>
</table>

### UC-003 – Manage Profile & Account Status
<table class="usecase-table">
	<tr><th colspan="2">Use Case 3 – (UC-003) Manage Profile & Account Status</th></tr>
	<tr><td><strong>Related Requirements</strong></td><td><span class="req-badge">REQ-004</span><span class="req-badge">REQ-028</span><span class="req-badge">REQ-024</span><span class="req-badge">REQ-025</span></td></tr>
	<tr><td><strong>Initiating Actor</strong></td><td>Client / Coach / Administrator</td></tr>
	<tr><td><strong>Actor’s Goal</strong></td><td>Maintain accurate profile or deactivate account</td></tr>
	<tr><td><strong>Participating Actors</strong></td><td>Storage Service; Audit Logger</td></tr>
	<tr><td><strong>Preconditions</strong></td><td>- User authenticated</td></tr>
	<tr><td><strong>Post conditions</strong></td><td>- Profile data updated OR account flagged for deactivation with retention policy applied</td></tr>
	<tr><td colspan="2"><strong>Flow of Events for main success scenario:</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8594;<br>&#8592;<br>&#8594;<br>&#8592;<br>&#8592;</td>
		<td>
			1. User opens profile settings.<br>
			2. Edits personal / privacy / preference fields.<br>
			3. System validates inputs and saves changes.<br>
			4. User optionally requests deactivation/delete.<br>
			5. System applies retention policy and updates status.<br>
			6. Audit record written.
		</td>
	</tr>
	<tr><td colspan="2"><strong>Flow of Events for Extensions (Alternate scenarios):</strong></td></tr>
	<tr>
		<td class="flow-arrows">&#8594;<br>&#8592;<br>&#8592;</td>
		<td>
			E1: Invalid field value → Highlight and display inline guidance.<br>
			E2: Delete request with active subscriptions → System blocks and lists dependencies.<br>
			E3: Privacy setting conflict → System warns about required fields.
		</td>
	</tr>
	<tr><td><strong>Priority</strong></td><td>4 (High)</td></tr>
</table>

### UC-004 – Administrative User & Role Management
<table class="usecase-table">
	<tr><th colspan="3">Use Case 4 – (UC-004) Administrative User & Role Management</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-003</span><span class="req-badge">REQ-052</span><span class="req-badge">REQ-053</span><span class="req-badge">REQ-085</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Administrator</td></tr>
	<tr class="alt-row"><td class="heading-cell">Actor's Goal</td><td colspan="2">Manage users, roles, and verification data securely</td></tr>
	<tr><td class="heading-cell">Participating Actors</td><td colspan="2">Audit Logger; Storage Service</td></tr>
	<tr class="alt-row"><td class="heading-cell">Preconditions</td><td colspan="2">- Admin authenticated<br>- Proper permissions loaded</td></tr>
	<tr><td class="heading-cell">Post Conditions</td><td colspan="2">- User accounts/roles updated<br>- All actions audit logged</td></tr>
	<tr class="alt-row"><td class="heading-cell" colspan="3"><strong>Flow of Events – Main Success Scenario</strong></td></tr>
	<tr>
		<td class="flow-arrows">→<br>→<br>→<br>→<br>←</td>
		<td colspan="2">1. Admin opens user management.<br>2. Applies filters/search.<br>3. Selects a user or bulk set.<br>4. Updates roles / verifies coach certs.<br>5. System saves changes & records audit.</td>
	</tr>
	<tr class="alt-row"><td class="heading-cell" colspan="3"><strong>Flow of Events – Extensions</strong></td></tr>
	<tr>
		<td class="flow-arrows">→<br>←</td>
		<td colspan="2">E1: Invalid role combination → System rejects with message.<br>E2: Expired certification detected → System flags and notifies coach.</td>
	</tr>
	<tr class="alt-row"><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-005 – Coach Profile & Certification Management
<table class="usecase-table">
	<tr><th colspan="3">Use Case 5 – (UC-005) Coach Profile & Certification Management</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-002</span><span class="req-badge">REQ-053</span><span class="req-badge">REQ-005</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Actor's Goal</td><td colspan="2">Maintain professional profile & submit certifications</td></tr>
	<tr><td class="heading-cell">Participating Actors</td><td colspan="2">Admin (verification)</td></tr>
	<tr class="alt-row"><td class="heading-cell">Preconditions</td><td colspan="2">- Coach account active</td></tr>
	<tr><td class="heading-cell">Post Conditions</td><td colspan="2">- Profile updated; certification status refreshed</td></tr>
	<tr class="alt-row"><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr><td class="flow-arrows">→<br>→<br>→<br>←</td><td colspan="2">1. Coach opens profile.<br>2. Edits specializations/bio.<br>3. Uploads certification file(s).<br>4. System stores, marks pending verification.</td></tr>
	<tr class="alt-row"><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr><td class="flow-arrows">→<br>←</td><td colspan="2">E1: File invalid → System rejects.<br>E2: Certification expired → System auto notifies & flags.</td></tr>
	<tr class="alt-row"><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-006 – Create / Structure Plan Template
<table class="usecase-table">
	<tr><th colspan="3">Use Case 6 – (UC-006) Create Plan Template</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-005</span><span class="req-badge">REQ-022</span><span class="req-badge">REQ-031</span><span class="req-badge">REQ-061</span><span class="req-badge">REQ-040</span><span class="req-badge">REQ-066</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Build reusable structured fitness/nutrition template</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Coach verified</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Template stored & available in library</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>→<br>←<br>←</td><td colspan="2">1. Select "Create Template".<br>2. Enter metadata (goal category).<br>3. Add workouts & meals (components).<br>4. Organize hierarchy (days/phases).<br>5. Save draft.<br>6. Publish template.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Missing fields → Prompt completion.<br>E2: Clone existing template → Prefill data.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-007 – Assign Plan (Single / Bulk)
<table class="usecase-table">
	<tr><th colspan="3">Use Case 7 – (UC-007) Assign Plan to Clients</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-006</span><span class="req-badge">REQ-032</span><span class="req-badge">REQ-063</span><span class="req-badge">REQ-062</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Assign personalized plan(s) to one or many clients</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Published template exists<br>- Clients available</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- PlanSubscription records created</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←</td><td colspan="2">1. Coach selects template.<br>2. Selects clients (single/bulk).<br>3. Customizes parameters.<br>4. Confirms assignment.<br>5. System creates subscriptions.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Client has conflicting active plan → Prompt pause.<br>E2: Partial bulk failure → Show report.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-008 – Manage Active Plan Subscription
<table class="usecase-table">
	<tr><th colspan="3">Use Case 8 – (UC-008) Manage Active Plan Subscription</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-007</span><span class="req-badge">REQ-033</span><span class="req-badge">REQ-062</span><span class="req-badge">REQ-064</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Follow, pause, resume plan; track completion</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Active subscription exists</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Updated state & progress metrics</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←<br>←</td><td colspan="2">1. Client opens plan dashboard.<br>2. Marks items completed.<br>3. System recalculates metrics.<br>4. Client pauses plan (optional).<br>5. Client resumes later.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Plan ended → System archives & prompts rating.<br>E2: Pause request → System stores snapshot state.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-009 – Daily Meal / Workout / Wellness Logging
<table class="usecase-table">
	<tr><th colspan="3">Use Case 9 – (UC-009) Log Daily Progress</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-008</span><span class="req-badge">REQ-035</span><span class="req-badge">REQ-039</span><span class="req-badge">REQ-055</span><span class="req-badge">REQ-056</span><span class="req-badge">REQ-057</span><span class="req-badge">REQ-049</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Capture daily activity and wellness data</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Active subscription day</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- DailyProgressLog persisted; metrics queued</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←<br>←</td><td colspan="2">1. Add meals with nutritional data.<br>2. Log workouts.<br>3. Record water, sleep, mood, stress, energy.<br>4. Attach photos / notes.<br>5. System validates & saves.<br>6. System updates log model.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Missing nutrition info → Prompt search.<br>E2: Invalid range → Reject field.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-010 – View Progress & Dashboards
<table class="usecase-table">
	<tr><th colspan="3">Use Case 10 – (UC-010) View Progress & Dashboards</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-009</span><span class="req-badge">REQ-013</span><span class="req-badge">REQ-014</span><span class="req-badge">REQ-079</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client / Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Visualize performance and adherence</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Progress data exists</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Insights displayed</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. System aggregates metrics.<br>2. Renders charts and trends.<br>3. Coach views multi-client aggregate.<br>4. Client applies filters.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: No data → Show onboarding tips.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-011 – Submit Ratings & Feedback
<table class="usecase-table">
	<tr><th colspan="3">Use Case 11 – (UC-011) Rate Plans & Coaches</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-010</span><span class="req-badge">REQ-042</span><span class="req-badge">REQ-043</span><span class="req-badge">REQ-044</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Provide qualitative & quantitative feedback</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Completed plan phase or coach interaction</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Rating stored & aggregated</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. Client opens rating dialog.<br>2. Enters scores & comments.<br>3. System validates & stores.<br>4. System updates aggregated metrics.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Anonymous toggle → Omit identity.<br>E2: Inappropriate content → Moderation queue.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-012 – Real-time Messaging & Notifications
<table class="usecase-table">
	<tr><th colspan="3">Use Case 12 – (UC-012) Messaging & Notifications</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-011</span><span class="req-badge">REQ-015</span><span class="req-badge">REQ-045</span><span class="req-badge">REQ-046</span><span class="req-badge">REQ-065</span><span class="req-badge">REQ-086</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client / Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Exchange messages & receive notifications</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Users authenticated & authorized to communicate</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Message stored; notifications delivered</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←<br>←</td><td colspan="2">1. User opens conversation.<br>2. Sends text/media message.<br>3. System persists message.<br>4. Real-time delivery to recipient.<br>5. Notification created.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Attachment too large → Compression attempt.<br>E2: Smart scheduling adjusts reminder timing.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-013 – Search Coaches / Plans / Content
<table class="usecase-table">
	<tr><th colspan="3">Use Case 13 – (UC-013) Search & Discovery</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-012</span><span class="req-badge">REQ-047</span><span class="req-badge">REQ-078</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Find suitable coaches or plans</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Indexed searchable data</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Results displayed</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. Client enters filters/keywords.<br>2. System executes ranked search.<br>3. Results returned.<br>4. Client saves search (optional).</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: No results → System broadens suggestions.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-014 – Modify / Version / Share Plans
<table class="usecase-table">
	<tr><th colspan="3">Use Case 14 – (UC-014) Plan Modification & Versioning</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-017</span><span class="req-badge">REQ-041</span><span class="req-badge">REQ-087</span><span class="req-badge">REQ-066</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Update plan with full version history</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Template exists</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- New version stored; history retained</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←<br>←</td><td colspan="2">1. Open target template.<br>2. Apply modifications.<br>3. System validates & creates new version record.<br>4. Coach may share with permitted coach.<br>5. Audit trail updated.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Active subscription → Schedule changes next cycle.<br>E2: Share denied (permission).</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-015 – Generate Weekly / Monthly Reports
<table class="usecase-table">
	<tr><th colspan="3">Use Case 15 – (UC-015) Generate Progress Reports</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-016</span><span class="req-badge">REQ-068</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client / Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Obtain analytic trends & summaries</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Sufficient historical data</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Report generated (view/export)</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. User selects date range.<br>2. System aggregates & analyzes.<br>3. System renders visual & predictive stats.<br>4. User exports or shares.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Insufficient data → Partial indicators with notice.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-016 – Upload / Manage Media & Files
<table class="usecase-table">
	<tr><th colspan="3">Use Case 16 – (UC-016) Media & File Management</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-019</span><span class="req-badge">REQ-049</span><span class="req-badge">REQ-050</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach / Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Store optimized media linked to entities</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Authenticated; storage quota available</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Media stored with metadata</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←</td><td colspan="2">1. User selects file(s).<br>2. System validates type & size.<br>3. System optimizes/compresses.<br>4. Stores & tags media.<br>5. Links to plan / meal / cert etc.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Bulk upload → Process asynchronously.<br>E2: Version control for documents.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-017 – Define & Track Goals / Milestones
<table class="usecase-table">
	<tr><th colspan="3">Use Case 17 – (UC-017) Goal & Milestone Management</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-020</span><span class="req-badge">REQ-021</span><span class="req-badge">REQ-058</span><span class="req-badge">REQ-064</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client / Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Track progress toward SMART goals</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Active plan or profile context</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Goal state & milestones updated</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←<br>←</td><td colspan="2">1. Define SMART goal.<br>2. Set milestones & target dates.<br>3. System tracks progress metrics.<br>4. Achievements generate badges.<br>5. Coach verifies (if required).</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Missed milestone → Notification.<br>E2: Verified milestone → Certificate created.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-018 – Friendships, Challenges, Social Sharing
<table class="usecase-table">
	<tr><th colspan="3">Use Case 18 – (UC-018) Social Connections & Challenges</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-018</span><span class="req-badge">REQ-051</span><span class="req-badge">REQ-074</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Engage socially for motivation</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Authenticated user</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Social graph / challenge state updated</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←</td><td colspan="2">1. Search/add friend.<br>2. Accept/decline requests.<br>3. Join or create challenge.<br>4. Track leaderboard.<br>5. Share achievements.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Privacy restriction → Access blocked.<br>E2: Challenge capacity reached → User informed.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-019 – Plan Completion & Certification
<table class="usecase-table">
	<tr><th colspan="3">Use Case 19 – (UC-019) Plan Completion & Certification</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-064</span><span class="req-badge">REQ-021</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">System / Client / Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Issue completion certificate</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Completion criteria satisfied</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Certificate generated & stored</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. System evaluates metrics.<br>2. Creates certificate.<br>3. Notifies client & coach.<br>4. Stores certificate record.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Pending coach verification.<br>E2: Metrics below threshold → Request extension.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-020 – System Monitoring & Content Moderation
<table class="usecase-table">
	<tr><th colspan="3">Use Case 20 – (UC-020) Administrative Monitoring & Moderation</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-029</span><span class="req-badge">REQ-030</span><span class="req-badge">REQ-054</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Administrator</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Monitor performance & moderate content</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Admin authenticated</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Metrics reviewed; actions logged</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. View usage & performance metrics.<br>2. Review flagged content.<br>3. Apply moderation actions.<br>4. Track resolution statuses.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Automated screening tags high-risk items.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-021 – Automated Metrics & Analytics Engine
<table class="usecase-table">
	<tr><th colspan="3">Use Case 21 – (UC-021) Automated Metrics & Analytics Engine</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-034</span><span class="req-badge">REQ-036</span><span class="req-badge">REQ-037</span><span class="req-badge">REQ-038</span><span class="req-badge">REQ-055</span><span class="req-badge">REQ-056</span><span class="req-badge">REQ-057</span><span class="req-badge">REQ-059</span><span class="req-badge">REQ-060</span><span class="req-badge">REQ-068</span><span class="req-badge">REQ-090</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">System (event/batch)</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Compute & update progress analytics automatically</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Logged data available</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Analytics models updated & cached</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←</td><td colspan="2">1. Ingest new data events.<br>2. Compute completion %, streaks, adherence.<br>3. Predict trends & improvement scores.<br>4. Update PlanProgress record.<br>5. Cache results.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Data anomalies → Flag validation errors.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">5</td></tr>
</table>

### UC-022 – Export / Backup / Offline Data
<table class="usecase-table">
	<tr><th colspan="3">Use Case 22 – (UC-022) Data Export, Backup & Offline Support</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-023</span><span class="req-badge">REQ-026</span><span class="req-badge">REQ-076</span><span class="req-badge">REQ-077</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client / Coach / System</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Export or safeguard data & support offline use</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Authenticated user</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Export generated; backups updated; offline cache synced</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←</td><td colspan="2">1. User selects export scope.<br>2. System packages data securely.<br>3. Backup job runs (scheduled).<br>4. Offline cache syncs when reconnected.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Large dataset → Background asynchronous job.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-023 – Secure Logout & Password Reset
<table class="usecase-table">
	<tr><th colspan="3">Use Case 23 – (UC-023) Security & Password Reset</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-025</span><span class="req-badge">REQ-027</span><span class="req-badge">REQ-069</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">User</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Reset password or terminate session securely</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Account exists</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Credentials updated; old sessions invalidated</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>→<br>←<br>←</td><td colspan="2">1. User initiates reset.<br>2. System sends secure token (MFA optional).<br>3. User submits new password.<br>4. System invalidates sessions.<br>5. User logs in with new password.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Token expired → Regenerate token.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-024 – Customize Dashboard & Interface
<table class="usecase-table">
	<tr><th colspan="3">Use Case 24 – (UC-024) Dashboard & UI Customization / Localization</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-070</span><span class="req-badge">REQ-081</span><span class="req-badge">REQ-080</span><span class="req-badge">REQ-088</span><span class="req-badge">REQ-024</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">User</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Personalize layout, language and branding</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Authenticated user</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Preferences persisted & applied</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. User rearranges widgets.<br>2. Selects language / theme.<br>3. Saves preferences.<br>4. System applies personalization.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: White-label branding applied for business accounts.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-025 – Nutrition Lookup & Meal Plan Creation
<table class="usecase-table">
	<tr><th colspan="3">Use Case 25 – (UC-025) Nutrition Database & Meal Planning</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-072</span><span class="req-badge">REQ-073</span><span class="req-badge">REQ-039</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach / Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Create meals with accurate nutrition totals</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Nutrition database populated</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Meal components saved with totals</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. Search foods.<br>2. Select items & portions.<br>3. System calculates totals.<br>4. Save meal / template component.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Recipe creation aggregates ingredient values.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-026 – Exercise Video Integration
<table class="usecase-table">
	<tr><th colspan="3">Use Case 26 – (UC-026) Workout Video Playback</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-071</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">View exercise demonstration video</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Video linked to exercise</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Playback stats updated</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←</td><td colspan="2">1. Load video player.<br>2. Track playback progress.<br>3. Mark exercise complete.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Low bandwidth → Lower resolution stream.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-027 – Calendar Integration & Reminders
<table class="usecase-table">
	<tr><th colspan="3">Use Case 27 – (UC-027) Calendar & Scheduling</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-075</span><span class="req-badge">REQ-015</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach / Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Schedule workouts, meals, reminders</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Active plans or consultations</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Events & notifications persisted</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. View calendar.<br>2. Add workouts/meals/events.<br>3. System syncs reminders.<br>4. Notifications sent.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Overlapping events → Conflict warning.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-028 – External API & Device Integrations
<table class="usecase-table">
	<tr><th colspan="3">Use Case 28 – (UC-028) API & Third-Party Integration</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-067</span><span class="req-badge">REQ-082</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">External App / Coach / Client</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Integrate device/app data via API</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- API key issued</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- External data validated & persisted</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. External system authenticates.<br>2. Performs allowed CRUD operation.<br>3. System validates payload.<br>4. Data stored / synced.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>←</td><td colspan="2">E1: Rate limit exceeded → 429 response.<br>E2: Revoked key → Access denied.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-029 – Manage Group Coaching Sessions
<table class="usecase-table">
	<tr><th colspan="3">Use Case 29 – (UC-029) Group Coaching Management</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-084</span><span class="req-badge">REQ-087</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">Coach</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Manage multiple clients in a shared plan environment</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Group feature enabled</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Group plan active</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. Define group.<br>2. Assign shared plan.<br>3. Broadcast updates.<br>4. Monitor aggregated progress.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Permission-based plan sharing enforced.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">2</td></tr>
</table>

### UC-030 – Automated Plan & Coach Recommendations
<table class="usecase-table">
	<tr><th colspan="3">Use Case 30 – (UC-030) Recommendation & Suggestion Engine</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-048</span><span class="req-badge">REQ-083</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">System</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Recommend plans & coaches</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- User profile & history data</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Recommendations displayed</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←</td><td colspan="2">1. Collect preferences & metrics.<br>2. Rank candidate templates & coaches.<br>3. Present recommendations.<br>4. User may refine feedback (implicit).</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Cold start → Popular defaults.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">3</td></tr>
</table>

### UC-031 – Comprehensive Audit Logging
<table class="usecase-table">
	<tr><th colspan="3">Use Case 31 – (UC-031) Audit Logging & Compliance</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-085</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">System / Administrator</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Capture immutable audit trail of events</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Monitored events configured</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Queryable immutable log entries</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←</td><td colspan="2">1. Capture event data.<br>2. Store immutable log entry.<br>3. Provide query/report interface.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Log rotation & archival lifecycle.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

### UC-032 – Graceful Error Handling & User Messaging
<table class="usecase-table">
	<tr><th colspan="3">Use Case 32 – (UC-032) Error Handling & Reliability</th></tr>
	<tr class="alt-row"><td class="heading-cell">Related Requirements</td><td colspan="2"><span class="req-badge">REQ-089</span></td></tr>
	<tr><td class="heading-cell">Initiating Actor</td><td colspan="2">User / System</td></tr>
	<tr class="alt-row"><td class="heading-cell">Goal</td><td colspan="2">Handle faults with informative recovery guidance</td></tr>
	<tr><td class="heading-cell">Preconditions</td><td colspan="2">- Fault condition or failure occurs</td></tr>
	<tr class="alt-row"><td class="heading-cell">Post Conditions</td><td colspan="2">- Error recorded, user given recovery options</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Main Flow</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→<br>→<br>←<br>←<br>←</td><td colspan="2">1. Detect error.
2. Log structured details.
3. Show user-friendly message.
4. Offer retry/recovery.
5. Aggregate for monitoring.</td></tr>
	<tr><td class="heading-cell" colspan="3"><strong>Extensions</strong></td></tr>
	<tr class="alt-row"><td class="flow-arrows">→</td><td colspan="2">E1: Critical failure → Alert administrator.</td></tr>
	<tr><td class="heading-cell">Priority</td><td colspan="2">4</td></tr>
</table>

---
## Requirement to Use Case Traceability Matrix

| Requirement | Mapped Use Case(s) |
|-------------|--------------------|
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-005 |
| REQ-003 | UC-004 |
| REQ-004 | UC-003 |
| REQ-005 | UC-006 |
| REQ-006 | UC-007 |
| REQ-007 | UC-008 |
| REQ-008 | UC-009 |
| REQ-009 | UC-010 |
| REQ-010 | UC-011 |
| REQ-011 | UC-012 |
| REQ-012 | UC-013 |
| REQ-013 | UC-010 |
| REQ-014 | UC-010 |
| REQ-015 | UC-012, UC-027 |
| REQ-016 | UC-015 |
| REQ-017 | UC-014 |
| REQ-018 | UC-018 |
| REQ-019 | UC-016 |
| REQ-020 | UC-017 |
| REQ-021 | UC-017, UC-019 |
| REQ-022 | UC-006 |
| REQ-023 | UC-022 |
| REQ-024 | UC-003, UC-024 |
| REQ-025 | UC-001, UC-002, UC-023 |
| REQ-026 | UC-022 |
| REQ-027 | UC-002, UC-023 |
| REQ-028 | UC-003 |
| REQ-029 | UC-020 |
| REQ-030 | UC-020 |
| REQ-031 | UC-006 |
| REQ-032 | UC-007 |
| REQ-033 | UC-008, UC-009 |
| REQ-034 | UC-021 |
| REQ-035 | UC-009 |
| REQ-036 | UC-021 |
| REQ-037 | UC-021 |
| REQ-038 | UC-021 |
| REQ-039 | UC-009, UC-025 |
| REQ-040 | UC-006 |
| REQ-041 | UC-014 |
| REQ-042 | UC-011 |
| REQ-043 | UC-011 |
| REQ-044 | UC-011 |
| REQ-045 | UC-012 |
| REQ-046 | UC-012 |
| REQ-047 | UC-013 |
| REQ-048 | UC-030 |
| REQ-049 | UC-016, UC-009 |
| REQ-050 | UC-016 |
| REQ-051 | UC-018 |
| REQ-052 | UC-004 |
| REQ-053 | UC-005, UC-004 |
| REQ-054 | UC-020 |
| REQ-055 | UC-009, UC-021 |
| REQ-056 | UC-009, UC-021 |
| REQ-057 | UC-009, UC-021 |
| REQ-058 | UC-017 |
| REQ-059 | UC-021 |
| REQ-060 | UC-021 |
| REQ-061 | UC-006, UC-014 |
| REQ-062 | UC-008, UC-007 |
| REQ-063 | UC-007 |
| REQ-064 | UC-019, UC-017, UC-008 |
| REQ-065 | UC-012 |
| REQ-066 | UC-014, UC-006 |
| REQ-067 | UC-028 |
| REQ-068 | UC-015, UC-021 |
| REQ-069 | UC-001, UC-023 |
| REQ-070 | UC-024 |
| REQ-071 | UC-026 |
| REQ-072 | UC-025 |
| REQ-073 | UC-025 |
| REQ-074 | UC-018 |
| REQ-075 | UC-027 |
| REQ-076 | UC-022 |
| REQ-077 | UC-022 |
| REQ-078 | UC-013 |
| REQ-079 | UC-010 |
| REQ-080 | UC-024 |
| REQ-081 | UC-024 |
| REQ-082 | UC-028 |
| REQ-083 | UC-030 |
| REQ-084 | UC-029 |
| REQ-085 | UC-031, UC-004 |
| REQ-086 | UC-012 |
| REQ-087 | UC-014, UC-029 |
| REQ-088 | UC-024 |
| REQ-089 | UC-032 |
| REQ-090 | UC-021 |

---
## Coverage Summary
All 90 functional requirements are mapped to at least one use case. High-priority (4–5) requirements predominantly cluster in UC-001, UC-002, UC-006, UC-007, UC-008, UC-009, UC-010, UC-011, UC-012, UC-014, UC-016, UC-017, UC-021, UC-024.

## Next Possible Enhancements
- Add sequence diagrams for UC-006, UC-007, UC-021
- Add pre/post condition formal state models for PlanSubscription lifecycle
- Mark CRUD matrix for each domain model

End of document.
 
---
## Atomic Use Case Catalogue (One Micro Use Case per Requirement)

The following catalogue decomposes every individual functional requirement (REQ-001 – REQ-090) into an atomic micro use case. These are intentionally concise, single-responsibility specifications that can drive granular backlog items, test cases, or BDD scenarios. Each atomic use case references its Parent Aggregate UC (from the earlier detailed section) for contextual expansion.

<style>
.atomic-title { background:#000; color:#fff; padding:6px 10px; font-size:14px; font-weight:600; }
.atomic-table { border-collapse:collapse; width:100%; font-family:Arial, sans-serif; margin:14px 0 28px 0; }
.atomic-table td { border:1px solid #000; padding:5px 8px; vertical-align:top; font-size:12px; background:#fff; }
.atomic-table tr:nth-child(even) td { background:#f7f7f7; }
.atomic-meta { width:170px; font-weight:600; background:#eee; }
.req-ref { border:1px solid #000; padding:1px 5px; font-size:11px; display:inline-block; margin-right:4px; }
.parent-uc { font-weight:600; }
.priority-high { font-weight:bold; }
</style>

> Format: Each micro use case = (Requirement Focus) → Steps (Goal-oriented) → Clear Success Criteria. Non-functional/security constraints inherited from parent aggregate unless explicitly restated.

### Legend (Atomic)
ID Pattern: A-REQ-XXX (Atomic)  | Parent UC: Reference to earlier comprehensive UC  | Priority = Requirement priority.

---

<!-- MICRO USE CASES START -->

<!-- We'll keep content succinct to maintain readability while covering all 90 requirements. -->

### A-REQ-001 – Client Registration
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-001</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-001, UC-002</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Client (Prospective)</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Create a verified client account.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Open registration. 2. Provide email/password/profile. 3. System validates & stores inactive account. 4. Verification email sent. 5. User confirms.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Active client account; audit log entry.</td></tr>
</table>

### A-REQ-002 – Coach Registration
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-002</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-001, UC-005</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach (Prospective)</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Create coach account with initial credential submission.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Coach registers selecting role. 2. Provides credentials and base profile. 3. System flags for later verification. 4. Email confirmation. 5. Account activated (pending cert review).</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Coach account active or pending verification status.</td></tr>
</table>

### A-REQ-003 – Admin Account & Access Management
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-003</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-004</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Administer system users and access rights.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Admin opens user list. 2. Adjusts roles/permissions. 3. System validates constraints. 4. Changes saved & logged.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Roles updated; audit trail persisted.</td></tr>
</table>

### A-REQ-004 – Manage Comprehensive Profile
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-004</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-003</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>User (Any Role)</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Edit extended profile & privacy settings.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Open profile. 2. Modify fields & preferences. 3. System validates & saves. 4. Confirmation displayed.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Updated profile visible immediately.</td></tr>
</table>

### A-REQ-005 – Create Detailed Plan Template
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-005</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-006</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Build modular workout & nutrition template.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Start new template. 2. Add exercises & meals modules. 3. Organize phases/days. 4. Save & publish.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Template available for assignment library.</td></tr>
</table>

### A-REQ-006 – Assign Personalized Plans
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-006</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-007</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Deliver tailored plan to client(s).</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Select template. 2. Select client(s). 3. Adjust parameters. 4. Confirm assignment.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>PlanSubscription created per client.</td></tr>
</table>

### A-REQ-007 – Client Plan Access
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-007</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-008</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>View and follow assigned plan entries.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Open plan dashboard. 2. Navigate daily entries. 3. Mark completions.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Progress metrics updated in real-time.</td></tr>
</table>

### A-REQ-008 – Log Daily Activities
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-008</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-009</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Record meals, workouts, wellness metrics.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Open daily log. 2. Enter meals/workouts/wellness. 3. Save.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>DailyProgressLog persisted.</td></tr>
</table>

### A-REQ-009 – Show Comprehensive Progress Statistics
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-009</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-010</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>View trend analytics of plan progress.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Access dashboard. 2. System aggregates metrics. 3. Render charts.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Interactive visualization displayed.</td></tr>
</table>

### A-REQ-010 – Rate Plan & Coach Performance
<table class="atomic-table">
 <tr><td class="atomic-meta">Requirement</td><td><span class="req-ref">REQ-010</span></td></tr>
 <tr><td class="atomic-meta">Parent UC</td><td class="parent-uc">UC-011</td></tr>
 <tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr>
 <tr><td class="atomic-meta">Goal</td><td>Submit multi-dimensional ratings.</td></tr>
 <tr><td class="atomic-meta">Main Flow</td><td>1. Open rating UI. 2. Provide scores/comments. 3. Submit.</td></tr>
 <tr><td class="atomic-meta">Success</td><td>Rating stored; aggregates refreshed.</td></tr>
</table>

### A-REQ-011 – Real-time Messaging Channel
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-011</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client / Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Exchange direct messages.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open conversation. 2. Compose message. 3. Send. 4. System delivers.</td></tr><tr><td class="atomic-meta">Success</td><td>Message stored & visible to both parties.</td></tr></table>

### A-REQ-012 – Advanced Coach Search
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-012</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-013</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Find coaches with filters.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter filters. 2. Execute search. 3. View ranked results.</td></tr><tr><td class="atomic-meta">Success</td><td>Filtered results returned.</td></tr></table>

### A-REQ-013 – Coach Dashboard Analytics View
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-013</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-010</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Review multi-client progress summary.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open analytics. 2. System aggregates multi-client data. 3. Displays charts.</td></tr><tr><td class="atomic-meta">Success</td><td>Coach sees performance KPIs.</td></tr></table>

### A-REQ-014 – Client Personalized Dashboard
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-014</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-010</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>View personalized progress visuals.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Access dashboard. 2. Load personal metrics. 3. Render visuals.</td></tr><tr><td class="atomic-meta">Success</td><td>Customized analytics displayed.</td></tr></table>

### A-REQ-015 – Automated Plan Reminders
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-015</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012, UC-027</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Send scheduled activity reminders.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Scheduler scans upcoming tasks. 2. Generates notifications. 3. Dispatch to user.</td></tr><tr><td class="atomic-meta">Success</td><td>User receives reminder.</td></tr></table>

### A-REQ-016 – Generate Progress Reports
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-016</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-015</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client / Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Create periodic progress report.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select period. 2. System aggregates metrics. 3. Generates report.</td></tr><tr><td class="atomic-meta">Success</td><td>Report ready for view/export.</td></tr></table>

### A-REQ-017 – Modify Active Plan Version
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-017</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-014</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Adjust plan to reflect client progress.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open plan. 2. Edit components. 3. Save new version.</td></tr><tr><td class="atomic-meta">Success</td><td>New plan version stored.</td></tr></table>

### A-REQ-018 – Manage Friend Connections
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-018</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-018</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Add or accept friend connection.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Search user. 2. Send request. 3. Recipient approves.</td></tr><tr><td class="atomic-meta">Success</td><td>Friendship established.</td></tr></table>

### A-REQ-019 – Upload Plan Related Media
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-019</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-016</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach / Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Store related images/files.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Choose file. 2. Validate & optimize. 3. Store & tag.</td></tr><tr><td class="atomic-meta">Success</td><td>File accessible with metadata.</td></tr></table>

### A-REQ-020 – Set SMART Fitness Goal
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-020</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-017</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Create measurable fitness goal.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Define goal parameters. 2. System validates. 3. Save goal.</td></tr><tr><td class="atomic-meta">Success</td><td>Goal stored with targets.</td></tr></table>

### A-REQ-021 – Verify Milestone Achievement
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-021</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-017, UC-019</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach / System</td></tr><tr><td class="atomic-meta">Goal</td><td>Confirm milestone completion.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. System flags milestone. 2. Coach reviews evidence. 3. Approves.</td></tr><tr><td class="atomic-meta">Success</td><td>Milestone marked verified.</td></tr></table>

### A-REQ-022 – Use Pre-built Plan Template
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-022</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-006</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Select base template to customize.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Browse library. 2. Choose template. 3. Clone/edit.</td></tr><tr><td class="atomic-meta">Success</td><td>Customized template saved.</td></tr></table>

### A-REQ-023 – Export Progress Data
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-023</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-022</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Download structured progress dataset.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Choose export scope. 2. Generate file. 3. Download.</td></tr><tr><td class="atomic-meta">Success</td><td>File available locally.</td></tr></table>

### A-REQ-024 – Responsive Mobile Access
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-024</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-003, UC-024</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Access system on mobile UI.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open site on mobile. 2. Layout adapts. 3. Interact normally.</td></tr><tr><td class="atomic-meta">Success</td><td>Usable mobile interface.</td></tr></table>

### A-REQ-025 – Secure Data Handling
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-025</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-001, UC-002, UC-023</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Protect data via security controls.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Apply encryption. 2. Enforce access checks. 3. Log sensitive actions.</td></tr><tr><td class="atomic-meta">Success</td><td>All protected operations succeed.</td></tr></table>

### A-REQ-026 – Automated Backups
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-026</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-022</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Create redundant data backups.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Schedule triggers. 2. Snapshot data. 3. Store redundantly.</td></tr><tr><td class="atomic-meta">Success</td><td>Backup artifacts stored.</td></tr></table>

### A-REQ-027 – Secure Logout
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-027</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-002, UC-023</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Terminate active session.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. User clicks logout. 2. System clears session. 3. Redirect to login.</td></tr><tr><td class="atomic-meta">Success</td><td>Session invalidated.</td></tr></table>

### A-REQ-028 – Deactivate / Delete Account
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-028</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-003</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Deactivate or request deletion.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open account settings. 2. Choose deactivate/delete. 3. Confirm.</td></tr><tr><td class="atomic-meta">Success</td><td>Status changed; retention policy applied.</td></tr></table>

### A-REQ-029 – View System Usage Analytics
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-029</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-020</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr><tr><td class="atomic-meta">Goal</td><td>Assess usage/performance metrics.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open monitoring dashboard. 2. System gathers KPIs. 3. Display charts.</td></tr><tr><td class="atomic-meta">Success</td><td>Metrics viewable.</td></tr></table>

### A-REQ-030 – Content Moderation Tools
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-030</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-020</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr><tr><td class="atomic-meta">Goal</td><td>Review & act on flagged content.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. View flagged items. 2. Inspect. 3. Approve/remove.</td></tr><tr><td class="atomic-meta">Success</td><td>Content state updated.</td></tr></table>

### A-REQ-031 – Implement PlanTemplate Model
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-031</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-006</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Persist structured template entities.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Define model fields. 2. Save template instances. 3. Query for reuse.</td></tr><tr><td class="atomic-meta">Success</td><td>Template data accessible.</td></tr></table>

### A-REQ-032 – Implement PlanSubscription Model
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-032</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-007</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Track client ↔ plan relationship.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Create record on assignment. 2. Update state changes. 3. Archive at completion.</td></tr><tr><td class="atomic-meta">Success</td><td>Subscription lifecycle maintained.</td></tr></table>

### A-REQ-033 – Implement PlanEntry Model
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-033</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-008, UC-009</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Represent daily actionable items.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Instantiate per day. 2. Link to template components. 3. Update completion status.</td></tr><tr><td class="atomic-meta">Success</td><td>Entries reflect progress.</td></tr></table>

### A-REQ-034 – Implement PlanProgress Model
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-034</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Persist aggregated progress metrics.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Initialize record. 2. Update after logs. 3. Expose to dashboards.</td></tr><tr><td class="atomic-meta">Success</td><td>Current metrics accessible.</td></tr></table>

### A-REQ-035 – Implement DailyProgressLog Model
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-035</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-009</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Store daily logging data.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Create log entry. 2. Append meal/workout/wellness fields. 3. Persist.</td></tr><tr><td class="atomic-meta">Success</td><td>Daily log retrievable.</td></tr></table>

### A-REQ-036 – Calculate Completion Percentages
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-036</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Derive weighted completion metric.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Gather PlanEntry statuses. 2. Apply weights. 3. Store result.</td></tr><tr><td class="atomic-meta">Success</td><td>Completion % updated.</td></tr></table>

### A-REQ-037 – Track Streaks
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-037</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Maintain current & longest streaks.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Evaluate daily completion. 2. Increment/reset counters. 3. Persist.</td></tr><tr><td class="atomic-meta">Success</td><td>Streak metrics accurate.</td></tr></table>

### A-REQ-038 – Monitor Adherence & Improvement
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-038</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Assess adherence & improvement scores.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Aggregate historical logs. 2. Compare targets. 3. Compute score.</td></tr><tr><td class="atomic-meta">Success</td><td>Scores persisted.</td></tr></table>

### A-REQ-039 – Support Multiple Meal Types
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-039</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-009, UC-025</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Log meals by category.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Choose meal type. 2. Enter details. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Meal stored with type tag.</td></tr></table>

### A-REQ-040 – Categorize Plans by Fitness Goal
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-040</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-006</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Assign goal category metadata.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select category. 2. Save template.</td></tr><tr><td class="atomic-meta">Success</td><td>Category visible for search.</td></tr></table>

### A-REQ-041 – Plan Versioning
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-041</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-014</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Retain change history.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Edit plan. 2. System forks new version. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Previous versions accessible.</td></tr></table>

### A-REQ-042 – 1–5 Plan Rating
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-042</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-011</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Submit numeric plan rating.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select score. 2. Submit. 3. Aggregate.</td></tr><tr><td class="atomic-meta">Success</td><td>Rating included in average.</td></tr></table>

### A-REQ-043 – Coach Rating
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-043</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-011</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Score coach performance.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Choose criteria. 2. Rate. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Coach score updated.</td></tr></table>

### A-REQ-044 – Detailed Feedback Collection
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-044</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-011</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Provide textual feedback.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter comment. 2. Submit. 3. System processes sentiment (if any).</td></tr><tr><td class="atomic-meta">Success</td><td>Feedback stored.</td></tr></table>

### A-REQ-045 – Notification System
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-045</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Generate notifications for events.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Event occurs. 2. Notification created. 3. Dispatch.</td></tr><tr><td class="atomic-meta">Success</td><td>User sees notification.</td></tr></table>

### A-REQ-046 – Notification Preferences
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-046</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Customize notification channels.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open settings. 2. Toggle preferences. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Preferences applied.</td></tr></table>

### A-REQ-047 – Advanced Coach Filters
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-047</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-013</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Apply multi-criteria search.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Set filters. 2. Search. 3. Display refined results.</td></tr><tr><td class="atomic-meta">Success</td><td>Filtered dataset returned.</td></tr></table>

### A-REQ-048 – Plan Discovery Recommendations
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-048</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-030</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Suggest relevant plans.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Analyze profile. 2. Rank plans. 3. Output list.</td></tr><tr><td class="atomic-meta">Success</td><td>Recommendation list displayed.</td></tr></table>

### A-REQ-049 – Image Upload with Tagging
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-049</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-016, UC-009</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Upload tagged images.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select image. 2. System optimizes & tags. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Image retrievable with tags.</td></tr></table>

### A-REQ-050 – Plan Document Management
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-050</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-016</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Manage plan document files.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Upload doc. 2. Version (optional). 3. Store.</td></tr><tr><td class="atomic-meta">Success</td><td>Document accessible.</td></tr></table>

### A-REQ-051 – Create Challenges
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-051</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-018</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Create or join challenge.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Initiate challenge. 2. Set rules. 3. Invite/join.</td></tr><tr><td class="atomic-meta">Success</td><td>Challenge active.</td></tr></table>

### A-REQ-052 – Admin Bulk Operations
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-052</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-004</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr><tr><td class="atomic-meta">Goal</td><td>Apply bulk user actions.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select users. 2. Choose operation. 3. Execute.</td></tr><tr><td class="atomic-meta">Success</td><td>Bulk changes persisted.</td></tr></table>

### A-REQ-053 – Coach Verification Lifecycle
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-053</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-005, UC-004</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr><tr><td class="atomic-meta">Goal</td><td>Verify coach certifications.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Review submissions. 2. Approve/deny. 3. Set status.</td></tr><tr><td class="atomic-meta">Success</td><td>Verification status updated.</td></tr></table>

### A-REQ-054 – System Monitoring Analytics
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-054</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-020</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Administrator</td></tr><tr><td class="atomic-meta">Goal</td><td>Analyze performance trends.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Fetch metrics. 2. Analyze. 3. Present trends.</td></tr><tr><td class="atomic-meta">Success</td><td>Performance insights available.</td></tr></table>

### A-REQ-055 – Track Energy Levels
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-055</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-009, UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client / System</td></tr><tr><td class="atomic-meta">Goal</td><td>Log daily energy rating.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter 1–5 energy score. 2. Save. 3. Aggregate.</td></tr><tr><td class="atomic-meta">Success</td><td>Energy trend charts updated.</td></tr></table>

### A-REQ-056 – Monitor Mood & Stress
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-056</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-009, UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client / System</td></tr><tr><td class="atomic-meta">Goal</td><td>Capture mood & stress scores.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter scores. 2. Save. 3. Aggregate correlations.</td></tr><tr><td class="atomic-meta">Success</td><td>Scores available for analytics.</td></tr></table>

### A-REQ-057 – Track Sleep & Water Intake
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-057</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-009, UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client / System</td></tr><tr><td class="atomic-meta">Goal</td><td>Log sleep hours & water consumed.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter sleep & water. 2. Save. 3. Update progress.</td></tr><tr><td class="atomic-meta">Success</td><td>Wellness metrics updated.</td></tr></table>

### A-REQ-058 – Milestone Tracking
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-058</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-017</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Track milestone progress.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Define milestone. 2. Monitor metrics. 3. Mark complete.</td></tr><tr><td class="atomic-meta">Success</td><td>Milestone status updated.</td></tr></table>

### A-REQ-059 – Data Validation
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-059</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Validate incoming progress data.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Receive data. 2. Check constraints. 3. Accept/reject.</td></tr><tr><td class="atomic-meta">Success</td><td>Only valid data stored.</td></tr></table>

### A-REQ-060 – Query Optimization & Caching
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-060</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Optimize heavy analytics queries.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Identify hotspots. 2. Add indexes/cache layer. 3. Re-run.</td></tr><tr><td class="atomic-meta">Success</td><td>Reduced query latency.</td></tr></table>

### A-REQ-061 – Delete Plan Template
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-061</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-006, UC-014</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Remove unused template.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select template. 2. Confirm deletion. 3. System checks dependencies.</td></tr><tr><td class="atomic-meta">Success</td><td>Template deleted if safe.</td></tr></table>

### A-REQ-062 – Pause / Resume Plan
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-062</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-008, UC-007</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Temporarily suspend plan.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Request pause. 2. System stores state. 3. Request resume.</td></tr><tr><td class="atomic-meta">Success</td><td>Plan state toggled.</td></tr></table>

### A-REQ-063 – Bulk Plan Assignment
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-063</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-007</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Assign plan to multiple clients at once.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select clients. 2. Confirm bulk assign. 3. Create subscriptions.</td></tr><tr><td class="atomic-meta">Success</td><td>All subscriptions created (or report exceptions).</td></tr></table>

### A-REQ-064 – Issue Completion Certificates
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-064</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-019, UC-017, UC-008</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Generate certificate post completion.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Detect completion. 2. Generate certificate. 3. Notify user.</td></tr><tr><td class="atomic-meta">Success</td><td>Certificate accessible.</td></tr></table>

### A-REQ-065 – Email Notifications
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-065</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Send email alerts.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Event triggers. 2. Generate email. 3. Dispatch.</td></tr><tr><td class="atomic-meta">Success</td><td>User receives email.</td></tr></table>

### A-REQ-066 – Clone Plan Template
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-066</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-014, UC-006</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Duplicate existing template.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select source template. 2. Choose clone. 3. Edit & save.</td></tr><tr><td class="atomic-meta">Success</td><td>New template created.</td></tr></table>

### A-REQ-067 – Device Integration
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-067</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-028</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>External Device/App</td></tr><tr><td class="atomic-meta">Goal</td><td>Sync external fitness data.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Device authenticates. 2. Sends data. 3. System stores.</td></tr><tr><td class="atomic-meta">Success</td><td>Data merged with logs.</td></tr></table>

### A-REQ-068 – Weekly & Monthly Summaries
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-068</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-015, UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / User</td></tr><tr><td class="atomic-meta">Goal</td><td>Compile period summaries.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select range or schedule triggers. 2. Aggregate. 3. Present summary.</td></tr><tr><td class="atomic-meta">Success</td><td>Summary displayed/exported.</td></tr></table>

### A-REQ-069 – Secure Password Reset (MFA)
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-069</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-001, UC-023</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Reset password securely.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Request reset. 2. Receive token/MFA. 3. Set new password.</td></tr><tr><td class="atomic-meta">Success</td><td>Password updated.</td></tr></table>

### A-REQ-070 – User Dashboard Customization
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-070</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-024</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Adjust layout components.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Rearrange widgets. 2. Save preferences.</td></tr><tr><td class="atomic-meta">Success</td><td>Layout persisted.</td></tr></table>

### A-REQ-071 – Workout Video Playback Tracking
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-071</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-026</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Play and track exercise video.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open exercise. 2. Play video. 3. Track progress.</td></tr><tr><td class="atomic-meta">Success</td><td>Playback stats stored.</td></tr></table>

### A-REQ-072 – Nutrition Database Query
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-072</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-025</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Search food items.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter term. 2. System searches DB. 3. Return items.</td></tr><tr><td class="atomic-meta">Success</td><td>Food list displayed.</td></tr></table>

### A-REQ-073 – Recipe Creation
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-073</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-025</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Create recipe from ingredients.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Add ingredients. 2. Calculate totals. 3. Save recipe.</td></tr><tr><td class="atomic-meta">Success</td><td>Recipe stored with macros.</td></tr></table>

### A-REQ-074 – Social Sharing Achievements
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-074</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-018</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Client</td></tr><tr><td class="atomic-meta">Goal</td><td>Share achievements externally.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select achievement. 2. Choose share channel. 3. Publish.</td></tr><tr><td class="atomic-meta">Success</td><td>Shared link/post created.</td></tr></table>

### A-REQ-075 – Calendar Scheduling
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-075</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-027</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Schedule workouts/meals.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Open calendar. 2. Add event. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Event visible with reminders.</td></tr></table>

### A-REQ-076 – Cross-device Sync
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-076</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-022</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Synchronize data across devices.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Detect changes. 2. Push sync updates. 3. Resolve conflicts.</td></tr><tr><td class="atomic-meta">Success</td><td>Consistent state multi-device.</td></tr></table>

### A-REQ-077 – Offline Mode Access
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-077</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-022</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Access core plan offline.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Cache essentials. 2. Work offline. 3. Sync on reconnect.</td></tr><tr><td class="atomic-meta">Success</td><td>Data reconciled.</td></tr></table>

### A-REQ-078 – Global Content Search
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-078</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-013</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Search across all content types.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Enter query. 2. Search indexes. 3. Show results.</td></tr><tr><td class="atomic-meta">Success</td><td>Unified results page.</td></tr></table>

### A-REQ-079 – Coaching Analytics Tools
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-079</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-010</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Gain business/client insights.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select analytic view. 2. System aggregates. 3. Display KPIs.</td></tr><tr><td class="atomic-meta">Success</td><td>Insights actionable.</td></tr></table>

### A-REQ-080 – Multi-language Interface
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-080</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-024</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User</td></tr><tr><td class="atomic-meta">Goal</td><td>Switch application language.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Choose language. 2. Reload localized assets.</td></tr><tr><td class="atomic-meta">Success</td><td>Interface localized.</td></tr></table>

### A-REQ-081 – Role-based Dashboard Layout
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-081</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-024</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Provide role-specific widgets.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Detect role. 2. Load layout config.</td></tr><tr><td class="atomic-meta">Success</td><td>Correct widgets rendered.</td></tr></table>

### A-REQ-082 – Public API Endpoints
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-082</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-028</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>External App</td></tr><tr><td class="atomic-meta">Goal</td><td>Access REST/Graph API.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Authenticate. 2. Invoke endpoint. 3. Receive response.</td></tr><tr><td class="atomic-meta">Success</td><td>Valid response returned.</td></tr></table>

### A-REQ-083 – Automated Plan Suggestions
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-083</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-030</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Suggest next plan iteration.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Analyze performance. 2. Identify gaps. 3. Recommend plan.</td></tr><tr><td class="atomic-meta">Success</td><td>Suggestion displayed.</td></tr></table>

### A-REQ-084 – Group Coaching Features
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-084</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-029</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Manage group sessions.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Create group. 2. Assign plan. 3. Monitor.</td></tr><tr><td class="atomic-meta">Success</td><td>Group active.</td></tr></table>

### A-REQ-085 – Audit Logging
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-085</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-031, UC-004</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Record security events.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Intercept event. 2. Serialize details. 3. Persist immutable log.</td></tr><tr><td class="atomic-meta">Success</td><td>Log retrievable.</td></tr></table>

### A-REQ-086 – Smart Notifications
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-086</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-012</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System</td></tr><tr><td class="atomic-meta">Goal</td><td>Adapt timing/content of notifications.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Analyze interaction patterns. 2. Adjust schedule/content. 3. Send.</td></tr><tr><td class="atomic-meta">Success</td><td>Notification delivered at optimized time.</td></tr></table>

### A-REQ-087 – Plan Sharing Permissions
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-087</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-014, UC-029</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Coach</td></tr><tr><td class="atomic-meta">Goal</td><td>Share plan with another coach or group.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Select plan. 2. Choose recipient. 3. Grant permissions.</td></tr><tr><td class="atomic-meta">Success</td><td>Recipient accesses shared plan.</td></tr></table>

### A-REQ-088 – White-label Customization
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-088</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-024</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>Business Admin</td></tr><tr><td class="atomic-meta">Goal</td><td>Apply branding (logo/colors domain).</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Upload branding assets. 2. Configure theme. 3. Save.</td></tr><tr><td class="atomic-meta">Success</td><td>Branding applied globally.</td></tr></table>

### A-REQ-089 – Error Handling UX
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-089</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-032</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>User / System</td></tr><tr><td class="atomic-meta">Goal</td><td>Display friendly error messages.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Detect error. 2. Log. 3. Show user message.</td></tr><tr><td class="atomic-meta">Success</td><td>User informed; can retry.</td></tr></table>

### A-REQ-090 – Automated Plan Effectiveness Testing
<table class="atomic-table"><tr><td class="atomic-meta">Requirement</td><td>REQ-090</td></tr><tr><td class="atomic-meta">Parent UC</td><td>UC-021</td></tr><tr><td class="atomic-meta">Primary Actor(s)</td><td>System / QA Analyst</td></tr><tr><td class="atomic-meta">Goal</td><td>Evaluate plan efficacy via automated tests.</td></tr><tr><td class="atomic-meta">Main Flow</td><td>1. Run test suite. 2. Collect metrics. 3. Flag anomalies.</td></tr><tr><td class="atomic-meta">Success</td><td>Report generated.</td></tr></table>

<!-- End of Atomic Micro Use Cases -->

