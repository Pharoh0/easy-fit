# Easy Fit – Comprehensive Use Case Descriptions (REQ-001 … REQ-090)

Plain black & white textual formatting (no colors) – each use case maps 1:1 to a single requirement. Structure kept concise for graduate documentation while preserving core elements: initiating actor, goal, participating actors, preconditions, postconditions, main success scenario, and alternate flows.

Legend:
UC-XXX ↔ REQ-XXX (Same numeric id for traceability)
Actors: Client, Coach, Admin, Staff, System (automated), Email Service, Scheduler, External Device / API.

================================================================
Use Case UC-001 – Client Account Registration & Login (REQ-001)
Initiating Actor: Client
Goal: Create verified client account and obtain authenticated session.
Participating Actors: System, Email Service
Preconditions: User not logged in; registration form accessible.
Postconditions: Verified client account stored; active session begun.
Main Success Scenario:
 1. Client opens registration form.
 2. Client enters details & submits.
 3. System validates data & creates inactive account; sends verification email.
 4. Client clicks verification link.
 5. System activates account; logs client in; dashboard displayed.
Alternate Flows:
 a. Invalid data -> System shows field errors; client corrects.
 b. Email bounce / delay -> Client requests resend; system reissues token.
 c. Expired token -> System issues new verification link.
================================================================
Use Case UC-002 – Coach Registration & Login (REQ-002)
Initiating Actor: Coach
Goal: Register as coach with role-based access pending credential review.
Participating Actors: System, Email Service, Staff (verification)
Preconditions: Coach not registered; credentials ready.
Postconditions: Coach account created (pending/active), session started.
Main Success Scenario:
 1. Coach opens signup (selects Coach role).
 2. Enters personal + credential data; uploads documents.
 3. System validates & stores; sends verification email.
 4. Coach verifies email; system flags account Awaiting Verification.
 5. Staff later approves -> system elevates to Active; coach logs in.
Alternate Flows:
 a. Missing docs -> System requests required uploads.
 b. Credential rejected -> Status set Rejected; coach notified to resubmit.
 c. Email not verified -> Limited access until verification.
================================================================
Use Case UC-003 – Administrator User & Access Management (REQ-003)
Initiating Actor: Admin
Goal: Manage user accounts and access rights.
Participating Actors: System, Staff
Preconditions: Admin authenticated.
Postconditions: User account changes (create/update/lock) persisted.
Main Success Scenario:
 1. Admin opens user management panel.
 2. Searches / filters users.
 3. Selects a user and edits roles/status.
 4. System validates & applies updates.
 5. System logs action and notifies affected user if needed.
Alternate Flows:
 a. Invalid role change -> System rejects with message.
 b. Concurrent edit -> System shows latest state; admin retries.
 c. Bulk action -> System applies batch & reports summary.
================================================================
Use Case UC-004 – Profile Creation & Management (REQ-004)
Initiating Actor: Client / Coach
Goal: Maintain comprehensive profile with privacy settings.
Participating Actors: System
Preconditions: User authenticated.
Postconditions: Profile data stored; privacy rules updated.
Main Success Scenario:
 1. User opens profile editor.
 2. Updates personal, health (client) or professional (coach) fields.
 3. Adjusts privacy controls.
 4. System validates & saves changes.
 5. Updated profile view rendered.
Alternate Flows:
 a. Invalid field -> Inline error; user corrects.
 b. Privacy conflict -> System warns & requires confirmation.
 c. Large photo upload -> System resizes/compresses.
================================================================
Use Case UC-005 – Create Plan Template (REQ-005)
Initiating Actor: Coach
Goal: Define modular workout & nutrition plan template.
Participating Actors: System
Preconditions: Coach authenticated; verification status Active.
Postconditions: PlanTemplate stored (Draft/Published).
Main Success Scenario:
 1. Coach selects "New Template".
 2. Enters metadata (goal, category, duration).
 3. Adds workouts/meals components.
 4. Marks template Published.
 5. System saves & indexes template.
Alternate Flows:
 a. Missing mandatory data -> System blocks publish.
 b. Save as draft -> Template stored Draft status.
 c. Session timeout -> Autosave draft prior to logout.
================================================================
Use Case UC-006 – Assign Personalized Plan (REQ-006)
Initiating Actor: Coach
Goal: Assign customized plan to a specific client.
Participating Actors: System, Client
Preconditions: Client active; at least one template exists.
Postconditions: PlanSubscription created Active for client.
Main Success Scenario:
 1. Coach opens client profile -> Assign Plan.
 2. Selects template & custom parameters.
 3. System validates schedule & conflicts.
 4. Coach confirms assignment.
 5. System creates subscription & notifies client.
Alternate Flows:
 a. Overlapping active plan -> Coach chooses replace or parallel.
 b. Invalid customization -> System requests correction.
 c. Client paused account -> System blocks until reactivated.
================================================================
Use Case UC-007 – Client Access & Follow Plan (REQ-007)
Initiating Actor: Client
Goal: View and interact with active plan details daily.
Participating Actors: System
Preconditions: PlanSubscription Active.
Postconditions: Access logs updated; plan day marked Viewed.
Main Success Scenario:
 1. Client opens dashboard.
 2. Selects today’s plan section.
 3. System displays workouts/meals & instructions.
 4. Client marks completed items.
 5. System updates completion progress in real time.
Alternate Flows:
 a. No active plan -> System suggests requesting one.
 b. Day locked (future) -> System restricts edits.
 c. Connectivity loss -> Offline cache served (if available).
================================================================
Use Case UC-008 – Log Daily Activities & Wellness (REQ-008)
Initiating Actor: Client
Goal: Record meals, workouts, wellness metrics for the day.
Participating Actors: System
Preconditions: Client authenticated; plan or logging enabled.
Postconditions: Daily log entries saved; progress recalculated.
Main Success Scenario:
 1. Client opens Daily Log.
 2. Inputs meal/workout/performance metrics.
 3. Adds wellness (sleep, mood, energy, water).
 4. Submits log; system validates & saves.
 5. System recalculates day completion & updates dashboard.
Alternate Flows:
 a. Duplicate meal entry -> System prompts merge/edit.
 b. Missing required metric -> System highlights field.
 c. Late entry after cutoff -> Stored flagged as Late.
================================================================
Use Case UC-009 – View Progress Statistics (REQ-009)
Initiating Actor: Client
Goal: See comprehensive progress trends & analytics.
Participating Actors: System
Preconditions: Existing logs and plan progress data.
Postconditions: Analytics viewed; no data change.
Main Success Scenario:
 1. Client opens Progress Dashboard.
 2. Selects timeframe & metrics.
 3. System aggregates data & renders charts.
 4. Client explores drill-down details.
 5. System stores last view preferences.
Alternate Flows:
 a. Insufficient data -> System shows placeholders & guidance.
 b. Large dataset -> System paginates / lazy loads.
 c. Metric unavailable -> System displays fallback note.
================================================================
Use Case UC-010 – Rate Plan & Coach Performance (REQ-010)
Initiating Actor: Client
Goal: Provide multi-criteria rating for plan and coach.
Participating Actors: System, Coach
Preconditions: Client has active or recently completed plan.
Postconditions: Rating stored; aggregated scores updated.
Main Success Scenario:
 1. Client opens rating form.
 2. Selects criteria scores & adds optional comment.
 3. Submits; system validates (one per period).
 4. System stores rating & recalculates averages.
 5. Coach notified of new feedback.
Alternate Flows:
 a. Duplicate rating -> System offers update existing.
 b. Offensive text -> Moderation flags & masks comment.
 c. Partial criteria -> System enforces required fields.
================================================================
Use Case UC-011 – Integrated Messaging (REQ-011)
Initiating Actor: Client / Coach
Goal: Exchange messages & files in conversation thread.
Participating Actors: System, File Storage
Preconditions: Both parties active; conversation exists or creatable.
Postconditions: Message stored; notification dispatched.
Main Success Scenario:
 1. User opens messaging module.
 2. Selects or creates conversation.
 3. Types message, optionally attaches file.
 4. Sends; system stores content & metadata.
 5. Recipient receives real-time notification.
Alternate Flows:
 a. Unsupported file -> System rejects with size/type reason.
 b. Network drop -> Message queued for retry.
 c. Blocked user -> System prevents send & informs user.
================================================================
Use Case UC-012 – Coach Search & Filtering (REQ-012)
Initiating Actor: Client
Goal: Find suitable coaches using filters & matching.
Participating Actors: System
Preconditions: Client authenticated; coaches available.
Postconditions: Search results displayed; optional shortlist updated.
Main Success Scenario:
 1. Client opens coach search.
 2. Applies filters (specialization, rating, availability, etc.).
 3. System executes search & ranking algorithm.
 4. Results listed with key info.
 5. Client views profile or saves coach.
Alternate Flows:
 a. No matches -> System suggests relaxing filters.
 b. Too many results -> System prompts refine.
 c. Invalid filter combo -> System resets conflicting fields.
================================================================
Use Case UC-013 – Coach Client Management Dashboard (REQ-013)
Initiating Actor: Coach
Goal: Monitor roster with analytics and quick actions.
Participating Actors: System
Preconditions: Coach active; at least one client.
Postconditions: Dashboard state updated; no data loss.
Main Success Scenario:
 1. Coach opens dashboard.
 2. System loads client list and KPIs.
 3. Coach filters/sorts by adherence or risk.
 4. Coach selects client for detail or action.
 5. System logs access & updates latency metrics.
Alternate Flows:
 a. No clients -> System displays onboarding tips.
 b. Slow metrics -> System serves cached snapshot.
 c. Access to suspended client -> Restricted notice.
================================================================
Use Case UC-014 – Personal Progress Dashboard (REQ-014)
Initiating Actor: Client
Goal: View personalized progress widgets & summaries.
Participating Actors: System
Preconditions: Logged data exists or placeholders set.
Postconditions: Dashboard preference cookies updated.
Main Success Scenario:
 1. Client opens dashboard.
 2. System loads configured widgets.
 3. Client rearranges or hides widgets.
 4. System saves layout preferences.
 5. Client drills into one widget for details.
Alternate Flows:
 a. No data -> System shows sample guidance.
 b. Widget load error -> Placeholder + retry option.
 c. Reset layout -> System restores defaults.
================================================================
Use Case UC-015 – Automated Plan Activity Reminders (REQ-015)
Initiating Actor: System Scheduler
Goal: Send timely reminders for workouts/meals/logging.
Participating Actors: System, Email/SMS, Client
Preconditions: Reminder preferences configured.
Postconditions: Reminder notifications delivered or queued.
Main Success Scenario:
 1. Scheduler identifies due activities.
 2. System checks user quiet hours & preferences.
 3. Generates reminder messages.
 4. Dispatches via chosen channels.
 5. Logs send status & updates reminder history.
Alternate Flows:
 a. Channel failure -> Retry/backoff then alternate channel.
 b. User snoozes -> System reschedules.
 c. Activity already completed -> Reminder suppressed.
================================================================
Use Case UC-016 – Generate Progress Reports & Predictions (REQ-016)
Initiating Actor: Coach / Client
Goal: Produce analytical progress report with trend projections.
Participating Actors: System
Preconditions: Sufficient historical data.
Postconditions: Report generated (view/download).
Main Success Scenario:
 1. Actor selects report period & metrics.
 2. System aggregates & analyzes data.
 3. Predictive model estimates goal timelines.
 4. System compiles charts & narrative summary.
 5. Report displayed; optional export.
Alternate Flows:
 a. Insufficient data -> System limits prediction section.
 b. Export failure -> User retries or selects alternative format.
 c. Large date range -> System paginates sections.
================================================================
Use Case UC-017 – Modify Plan with Version Control (REQ-017)
Initiating Actor: Coach
Goal: Update active plan while preserving history.
Participating Actors: System, Client
Preconditions: PlanSubscription Active.
Postconditions: New plan version stored; client sees update notice.
Main Success Scenario:
 1. Coach opens plan editor for client.
 2. Adjusts components (exercises/meals/notes).
 3. Adds version note & submits.
 4. System creates new version; archives previous.
 5. Client notified with change summary.
Alternate Flows:
 a. Validation errors -> Coach corrects before saving.
 b. Client mid-session -> Changes scheduled to start next day.
 c. Revert request -> Coach selects prior version; system reinstates.
================================================================
Use Case UC-018 – Client Friendship Connection (REQ-018)
Initiating Actor: Client
Goal: Connect with another client for social support.
Participating Actors: System, Other Client
Preconditions: Both clients active; privacy allows invites.
Postconditions: Friendship relation created (Pending/Accepted).
Main Success Scenario:
 1. Client searches or views another profile.
 2. Sends friend request.
 3. System records Pending & notifies recipient.
 4. Recipient accepts.
 5. System sets status Active; enables social features.
Alternate Flows:
 a. Recipient declines -> Status Declined; sender informed.
 b. Duplicate request -> System prevents and shows pending state.
 c. Blocked user -> Request disallowed.
================================================================
Use Case UC-019 – Plan-Related Media Upload & Management (REQ-019)
Initiating Actor: Coach / Client
Goal: Upload and manage images/videos tied to plan items.
Participating Actors: System, Media Storage
Preconditions: Authenticated; storage quota available.
Postconditions: Media stored; metadata linked to entity.
Main Success Scenario:
 1. Actor selects Upload in plan context.
 2. Chooses file(s) & enters caption/tag.
 3. System validates type/size; compresses.
 4. Stores media & updates plan item references.
 5. Media accessible in galleries.
Alternate Flows:
 a. Oversize file -> System prompts to compress/retry.
 b. Unsupported format -> Reject with guidance.
 c. Quota exceeded -> User prompted to delete old media.
================================================================
Use Case UC-020 – Set & Track SMART Fitness Goals (REQ-020)
Initiating Actor: Client
Goal: Define measurable goals with milestones & target date.
Participating Actors: System, Coach (optional)
Preconditions: Client authenticated.
Postconditions: Goal record created with tracking schedule.
Main Success Scenario:
 1. Client opens Goals; selects Add.
 2. Enters SMART parameters.
 3. System validates measurability & timeframe.
 4. Goal saved Active; milestones scheduled.
 5. Dashboard reflects new goal widget.
Alternate Flows:
 a. Unrealistic target flagged -> System suggests adjustments.
 b. Duplicate goal -> Prompt to merge or proceed.
 c. Early completion -> Client marks achieved; system archives.
================================================================
Use Case UC-021 – Coach Verifies Client Milestones (REQ-021)
Initiating Actor: Coach
Goal: Confirm client-reported milestone completion.
Participating Actors: System, Client
Preconditions: Milestone pending verification.
Postconditions: Milestone status Verified; achievement recorded.
Main Success Scenario:
 1. Coach views pending milestones list.
 2. Opens a milestone detail (evidence attached).
 3. Confirms validity.
 4. System marks Verified & updates progress.
 5. Client notified & badge unlocked if applicable.
Alternate Flows:
 a. Insufficient evidence -> Coach requests more info.
 b. Rejected -> System marks Rejected with reason.
 c. Timeout (no action) -> System sends reminder to coach.
================================================================
Use Case UC-022 – Use Pre-built Plan Templates (REQ-022)
Initiating Actor: Coach
Goal: Select and adapt shared template for a client.
Participating Actors: System
Preconditions: Library contains templates.
Postconditions: New plan instance cloned & customized.
Main Success Scenario:
 1. Coach opens Template Library.
 2. Searches/selects a pre-built template.
 3. Clicks Clone & customizes parameters.
 4. System validates & saves adapted version.
 5. Coach assigns to client.
Alternate Flows:
 a. Template deprecated -> System warns; suggests alternative.
 b. Clone conflict -> Unique name required.
 c. Incomplete customization -> System blocks assignment.
================================================================
Use Case UC-023 – Export Progress Data (REQ-023)
Initiating Actor: Client
Goal: Export personal progress/log data.
Participating Actors: System, Export Service
Preconditions: Data exists; user authenticated.
Postconditions: Export file generated & downloaded.
Main Success Scenario:
 1. Client opens Export section.
 2. Selects date range & format (CSV/JSON/PDF).
 3. System validates range & queues job if large.
 4. Job completes; file prepared.
 5. Client downloads file.
Alternate Flows:
 a. Large dataset -> Async processing with notification.
 b. Unsupported format -> System offers alternatives.
 c. Expired download link -> Client regenerates.
================================================================
Use Case UC-024 – Mobile Responsive Access (REQ-024)
Initiating Actor: Client / Coach
Goal: Access platform features seamlessly on mobile.
Participating Actors: System
Preconditions: Mobile device & browser supported.
Postconditions: Responsive layout served; preferences stored.
Main Success Scenario:
 1. User logs in from mobile.
 2. System detects viewport & serves responsive templates.
 3. User navigates to plan/log screens.
 4. Performs interactions (log workout, view stats).
 5. System optimizes images & caching.
Alternate Flows:
 a. Unsupported browser -> Warning with fallback.
 b. Slow network -> System serves low-bandwidth mode.
 c. Orientation change -> Layout reflows correctly.
================================================================
Use Case UC-025 – Secure Data Handling & Privacy (REQ-025)
Initiating Actor: System / Admin
Goal: Protect user data with encryption & privacy controls.
Participating Actors: System, Database, Admin
Preconditions: Security modules configured.
Postconditions: Data operations logged & encrypted.
Main Success Scenario:
 1. User submits sensitive info.
 2. System validates & encrypts at rest.
 3. Access requests checked via RBAC.
 4. Audit log entry written for access.
 5. Data served over TLS to authorized user.
Alternate Flows:
 a. Unauthorized access attempt -> Denied & alert triggered.
 b. Encryption failure -> System retries / isolates record.
 c. Privacy setting restricts field -> Field masked.
================================================================
Use Case UC-026 – Automated Data Backup & Recovery (REQ-026)
Initiating Actor: System Scheduler
Goal: Perform routine backups for disaster recovery.
Participating Actors: System, Storage
Preconditions: Backup destination configured.
Postconditions: Backup snapshot stored; integrity verified.
Main Success Scenario:
 1. Scheduler triggers backup.
 2. System exports database & media metadata.
 3. Stores snapshot & computes checksum.
 4. Verifies integrity vs checksum.
 5. Logs success & rotates old backups.
Alternate Flows:
 a. Storage full -> System alerts admin & retries later.
 b. Checksum mismatch -> Re-run backup; flag incident.
 c. Partial failure -> Incremental retry on failed segments.
================================================================
Use Case UC-027 – Secure Logout & Session Cleanup (REQ-027)
Initiating Actor: User (Client/Coach/Admin)
Goal: Terminate session securely.
Participating Actors: System
Preconditions: User authenticated.
Postconditions: Session invalidated; tokens revoked.
Main Success Scenario:
 1. User clicks Logout.
 2. System invalidates session & clears cookies.
 3. Revokes refresh tokens.
 4. Redirects to landing page.
 5. Logs event in security audit.
Alternate Flows:
 a. Session already expired -> System still shows logged-out state.
 b. Network failure -> Local storage cleared; user warned.
 c. Multiple devices -> Only chosen session terminated (if option).
================================================================
Use Case UC-028 – Account Deactivation / Deletion (REQ-028)
Initiating Actor: User
Goal: Deactivate or request deletion of account data.
Participating Actors: System, Admin (for hard delete approval)
Preconditions: User authenticated; no pending compliance hold.
Postconditions: Account status updated or queued for deletion.
Main Success Scenario:
 1. User opens Account Settings.
 2. Chooses Deactivate or Delete.
 3. System shows consequences & confirmation.
 4. User confirms; system updates status or schedules purge.
 5. Confirmation email sent.
Alternate Flows:
 a. Active plan obligations -> System warns & blocks delete.
 b. Regulatory retention -> System anonymizes instead.
 c. User reactivates before purge -> Status restored.
================================================================
Use Case UC-029 – Monitor System Usage & Performance (REQ-029)
Initiating Actor: Admin
Goal: View platform performance dashboards.
Participating Actors: System, Monitoring Service
Preconditions: Metrics collection active.
Postconditions: Admin insights gathered; no data change.
Main Success Scenario:
 1. Admin opens Performance panel.
 2. System retrieves KPIs (latency, TPS, active users).
 3. Admin filters timeframe.
 4. Charts rendered; anomalies highlighted.
 5. Admin exports summary.
Alternate Flows:
 a. Metric source offline -> System shows last cached.
 b. Permission lacking -> Access denied.
 c. Large export -> Async job with later download.
================================================================
Use Case UC-030 – Content Moderation & Quality Control (REQ-030)
Initiating Actor: Staff
Goal: Review and moderate user-generated content.
Participating Actors: System, Users
Preconditions: Moderation queue populated.
Postconditions: Items approved, edited, or removed.
Main Success Scenario:
 1. Staff opens moderation queue.
 2. Reviews each flagged item.
 3. Takes action (approve/edit/remove).
 4. System updates content status & logs action.
 5. User notified if removal/edit.
Alternate Flows:
 a. False positive -> Staff unflags item.
 b. Escalation needed -> Item forwarded to Admin.
 c. Bulk approve -> System processes batch & summary.
================================================================
Use Case UC-031 – Implement PlanTemplate Model (REQ-031)
Initiating Actor: System / Developer (Design time)
Goal: Support hierarchical plan template structure.
Participating Actors: System, Database
Preconditions: Migration pending.
Postconditions: Model deployed & usable in UI.
Main Success Scenario:
 1. Developer defines model fields & relationships.
 2. System runs migrations.
 3. Admin / Coach creates sample templates.
 4. System validates hierarchy.
 5. Templates appear in library.
Alternate Flows:
 a. Migration conflict -> Developer resolves & reruns.
 b. Missing index -> Performance warning shown.
 c. Invalid relation -> Save blocked until corrected.
================================================================
Use Case UC-032 – Implement PlanSubscription Model (REQ-032)
Initiating Actor: System / Coach
Goal: Relate clients to plans with state tracking.
Participating Actors: System, Database
Preconditions: Models migrated.
Postconditions: Subscription record created/updated.
Main Success Scenario:
 1. Coach assigns plan -> System creates subscription (Active).
 2. System tracks start/end dates.
 3.
