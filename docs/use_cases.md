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
 3. Progress updates adjust state (Completed/Expired).
 4. Pause/resume transitions allowed.
 5. Audit log updated.
Alternate Flows:
 a. Duplicate active -> System enforces rule or parallel flag.
 b. Invalid state change -> Rejected with reason.
 c. Auto-expire -> Status set to Expired at end date.
================================================================
Use Case UC-033 – Implement PlanEntry Model (REQ-033)
Initiating Actor: System / Coach
Goal: Store granular daily activities for plans.
Participating Actors: System
Preconditions: Templates exist.
Postconditions: PlanEntry records created for schedule.
Main Success Scenario:
 1. Coach defines plan days.
 2. System generates daily entries.
 3. Client views entries & completes items.
 4. System updates completion flags.
 5. Aggregates metrics into progress.
Alternate Flows:
 a. Plan modification -> New entries versioned.
 b. Skipped day -> System records zero completion.
 c. Entry deletion attempt -> Block if historical data linked.
================================================================
Use Case UC-034 – Implement PlanProgress Model (REQ-034)
Initiating Actor: System
Goal: Track cumulative progress metrics automatically.
Participating Actors: System, Database
Preconditions: PlanSubscription Active; entries exist.
Postconditions: Progress record updated after events.
Main Success Scenario:
 1. Client logs activity.
 2. System recalculates completion % & streaks.
 3. Updates adherence & improvement scores.
 4. Stores snapshot metrics.
 5. Dashboard reflects updated values.
Alternate Flows:
 a. Calculation error -> System retries & logs.
 b. Missing data -> Uses last known baseline.
 c. High load -> Defers calculation to queue.
================================================================
Use Case UC-035 – DailyProgressLog Model (REQ-035)
Initiating Actor: System / Client
Goal: Persist detailed daily log entries.
Participating Actors: System
Preconditions: Client active; date within plan range.
Postconditions: Daily log stored; validations passed.
Main Success Scenario:
 1. Client opens daily log form.
 2. Inputs metrics & submits.
 3. System validates uniqueness per day.
 4. Saves record & triggers progress update.
 5. Confirms success to client.
Alternate Flows:
 a. Duplicate log -> Offer edit existing.
 b. Invalid metric range -> Reject field.
 c. Late submission -> Mark as Late.
================================================================
Use Case UC-036 – Calculate Completion Percentages (REQ-036)
Initiating Actor: System
Goal: Compute weighted completion for plan/day.
Participating Actors: System
Preconditions: Entries & weights configured.
Postconditions: Percentages persisted in progress.
Main Success Scenario:
 1. Trigger (log update) fires calculation.
 2. System fetches weighted components.
  3. Computes completion ratio.
 4. Stores value & updates cache.
 5. Notifies dashboards to refresh.
Alternate Flows:
 a. Weight misconfiguration -> Default equal weighting used.
 b. Division by zero -> System sets 0% and logs warning.
 c. High frequency updates -> Debounced batch processing.
================================================================
Use Case UC-037 – Track Streaks with Rewards (REQ-037)
Initiating Actor: System
Goal: Maintain current & longest streak metrics.
Participating Actors: System, Client
Preconditions: Daily log events occur.
Postconditions: Streak values updated; rewards triggered.
Main Success Scenario:
 1. Client submits daily completion above threshold.
 2. System checks previous day success.
 3. Increments current streak or resets.
 4. Updates longest if surpassed.
 5. Issues reward notification if milestone achieved.
Alternate Flows:
 a. Missed day -> Current streak resets to 0.
 b. Manual adjustment -> Admin logs override with reason.
 c. Retroactive entry -> System recalculates affected days.
================================================================
Use Case UC-038 – Monitor Adherence & Improvement (REQ-038)
Initiating Actor: System
Goal: Compute adherence metrics & improvement score.
Participating Actors: System, Coach
Preconditions: Historical logs available.
Postconditions: Scores stored & viewable in dashboards.
Main Success Scenario:
 1. Scheduler runs adherence job.
 2. System aggregates completion & consistency indicators.
 3. Applies predictive model for improvement.
 4. Stores updated scores.
 5. Coaches see updated analytics.
Alternate Flows:
 a. Data gap -> System interpolates or flags partial.
 b. Model error -> Falls back to baseline formula.
 c. High load -> Job rescheduled / throttled.
================================================================
Use Case UC-039 – Multiple Meal Types with Nutritional Analysis (REQ-039)
Initiating Actor: Client
Goal: Log meals categorized (breakfast, lunch, dinner, snacks) with nutrition.
Participating Actors: System
Preconditions: Nutrition module active.
Postconditions: Meal entries saved; totals updated.
Main Success Scenario:
 1. Client selects meal type.
  2. Searches food & portion size.
 3. System pulls nutritional data & calculates totals.
 4. Client saves meal.
 5. Daily nutrient summary updated.
Alternate Flows:
 a. Food not found -> Client adds custom item.
 b. Duplicate meal -> Prompt to edit quantity.
 c. Exceeded target -> System warns & suggests adjustments.
================================================================
Use Case UC-040 – Plan Categorization by Fitness Goals (REQ-040)
Initiating Actor: Coach
Goal: Tag plan templates with goal categories.
Participating Actors: System
Preconditions: Template being created/edited.
Postconditions: Category metadata stored & searchable.
Main Success Scenario:
 1. Coach selects categories (weight loss, endurance, etc.).
 2. System validates at least one category.
 3. Saves template metadata.
 4. Category index updated.
 5. Template discoverable via filters.
Alternate Flows:
 a. Too many categories -> System enforces limit.
 b. Deprecated category -> Suggests replacement.
 c. No category -> Blocks publish.
================================================================
Use Case UC-041 – Plan Versioning & Tracking (REQ-041)
Initiating Actor: Coach
Goal: Maintain history of plan modifications.
Participating Actors: System
Preconditions: Existing plan version.
Postconditions: New version stored; history accessible.
Main Success Scenario:
 1. Coach edits plan.
 2. System duplicates current version snapshot.
 3. Applies edits to new version.
 4. Updates references & marks prior archived.
 5. Version history view updated.
Alternate Flows:
 a. Conflict editing -> System merges or blocks saving.
 b. Rollback -> Coach selects previous version; system reinstates.
 c. Excessive versions -> System prompts cleanup.
================================================================
Use Case UC-042 – Plan Rating (REQ-042)
Initiating Actor: Client
Goal: Provide 1-5 plan rating with criteria.
Participating Actors: System
Preconditions: Client used plan for minimum period.
Postconditions: Rating stored & aggregated.
Main Success Scenario:
 1. Client opens plan rating prompt.
 2. Selects overall & sub-scores.
 3. Submits; system validates.
 4. Stores rating & updates averages.
 5. Coach sees updated plan metrics.
Alternate Flows:
 a. Early rating attempt -> System delays until threshold.
 b. Incomplete criteria -> Prompt completion.
 c. Withdraw rating -> Client replaces or removes.
================================================================
Use Case UC-043 – Coach Rating & Feedback (REQ-043)
Initiating Actor: Client
Goal: Rate coach interaction & expertise.
Participating Actors: System, Coach
Preconditions: Active or recently concluded coaching period.
Postconditions: Feedback recorded; coach KPIs updated.
Main Success Scenario:
 1. Client opens coach profile -> Leave Feedback.
 2. Provides scores & optional comment.
 3. System validates once per evaluation window.
 4. Stores feedback & recalculates rating.
 5. Coach notified (anonymized if set).
Alternate Flows:
 a. Offensive content -> Auto moderation & hold.
 b. Duplicate -> Offer to edit prior feedback.
 c. Anonymous preference -> Name hidden.
================================================================
Use Case UC-044 – Feedback Analysis (REQ-044)
Initiating Actor: System / Coach
Goal: Aggregate and analyze textual feedback (sentiment).
Participating Actors: System
Preconditions: Feedback entries exist.
Postconditions: Sentiment scores appended to feedback analytics.
Main Success Scenario:
 1. Scheduler processes new feedback batch.
 2. Runs sentiment & keyword extraction.
 3. Updates analytics dataset.
 4. Coach dashboard displays trends.
 5. System flags negative trend alerts.
Alternate Flows:
 a. NLP service unavailable -> Retry later.
 b. Language unsupported -> Mark as unprocessed.
 c. Low confidence -> Flag for manual review.
================================================================
Use Case UC-045 – Notification System for Reminders (REQ-045)
Initiating Actor: System
Goal: Deliver plan, log, achievement notifications.
Participating Actors: System, Channels (Email/Push)
Preconditions: Events triggered; preferences allow.
Postconditions: Notifications sent or queued.
Main Success Scenario:
 1. Event occurs (log due / achievement).
 2. System builds notification payload.
 3. Selects channel per preference.
 4. Sends & records status.
 5. Updates unread notifications list.
Alternate Flows:
 a. Channel failure -> Switch to fallback channel.
 b. User muted type -> Suppress send.
 c. Duplicate event -> Debounce suppression.
================================================================
Use Case UC-046 – Manage Notification Preferences (REQ-046)
Initiating Actor: User
Goal: Customize notification channels & frequency.
Participating Actors: System
Preconditions: User authenticated.
Postconditions: Preference settings saved.
Main Success Scenario:
 1. User opens Notification Settings.
 2. Toggles types & selects channels.
 3. Adjusts quiet hours.
 4. Saves settings.
 5. System applies new rules.
Alternate Flows:
 a. Invalid quiet hour range -> Error prompt.
 b. All critical types off -> Warning confirmation.
 c. Reset defaults -> System restores baseline.
================================================================
Use Case UC-047 – Advanced Coach Search (REQ-047)
Initiating Actor: Client
Goal: Execute multi-filter & recommendation-based coach search.
Participating Actors: System
Preconditions: Coach dataset indexed.
Postconditions: Ranked list displayed.
Main Success Scenario:
 1. Client enters filters.
 2. System applies filters & scoring model.
 3. Generates ranked results.
 4. Displays with recommendation tags.
 5. Client refines or selects a coach.
Alternate Flows:
 a. Sparse results -> System broadens criteria suggestion.
 b. Model failure -> Fallback to basic filter order.
 c. Conflicting filters -> User prompted to adjust.
================================================================
Use Case UC-048 – Plan Discovery & Recommendations (REQ-048)
Initiating Actor: Client
Goal: Discover suggested plans based on profile & history.
Participating Actors: System
Preconditions: Recommendation engine active.
Postconditions: Suggested plan list shown.
Main Success Scenario:
 1. Client opens Plan Discovery.
 2. System fetches profile & past adherence data.
 3. Recommendation model ranks templates.
 4. List displayed with rationales.
 5. Client selects plan to request/assign.
Alternate Flows:
 a. Insufficient data -> Popular plans displayed.
 b. Model timeout -> Cached suggestions shown.
 c. Client filters -> Model re-ranks subset.
================================================================
Use Case UC-049 – Image Uploads with Auto Tagging (REQ-049)
Initiating Actor: Client / Coach
Goal: Upload images for meals/exercises auto-tagged.
Participating Actors: System, Tagging Service
Preconditions: Media service available.
Postconditions: Image stored; tags appended.
Main Success Scenario:
 1. User uploads image.
 2. System validates & stores.
 3. Sends to tagging service.
 4. Receives tags & associates.
 5. Displays image with tags.
Alternate Flows:
 a. Tagging service down -> Store without tags; retry later.
 b. Low confidence tag -> Flag for manual edit.
 c. Oversize image -> Compressed before store.
================================================================
Use Case UC-050 – Plan Document File Management (REQ-050)
Initiating Actor: Coach
Goal: Manage supplementary plan documents with versioning.
Participating Actors: System
Preconditions: Plan template exists.
Postconditions: Document versions tracked.
Main Success Scenario:
 1. Coach uploads document.
 2. System assigns version number.
 3. Coach optionally adds notes.
 4. System indexes content metadata.
 5. Clients access latest document.
Alternate Flows:
 a. Replace file -> New version created.
 b. Delete attempt with active link -> Block & warn.
 c. Unsupported format -> Reject with advice.
================================================================
Use Case UC-051 – Create Challenges & Leaderboards (REQ-051)
Initiating Actor: Staff / Coach
Goal: Launch challenge with participation metrics.
Participating Actors: System, Participants
Preconditions: Challenge parameters defined.
Postconditions: Challenge active; leaderboard initialized.
Main Success Scenario:
 1. Initiator defines challenge rules & metrics.
 2. System validates timeframe & overlaps.
 3. Challenge published; invites sent.
 4. Participants log qualifying activities.
 5. Leaderboard updates periodically.
Alternate Flows:
 a. Insufficient participants -> Auto cancel or extend signup.
 b. Rule violation -> Participant flagged/removed.
 c. Metric tie -> System applies tie-breaker rule.
================================================================
Use Case UC-052 – Admin User Management Interface (REQ-052)
Initiating Actor: Admin
Goal: Bulk manage users (activate/suspend).
Participating Actors: System
Preconditions: Admin authenticated.
Postconditions: Selected user statuses updated.
Main Success Scenario:
 1. Admin selects multiple users.
 2. Chooses bulk action (suspend/activate).
 3. System validates dependencies.
 4. Applies updates & logs actions.
 5. Summary report shown.
Alternate Flows:
 a. Partial failure -> Report with specifics.
 b. Permission error -> Action aborted.
 c. Undo request -> Reversal for last batch (if allowed).
================================================================
Use Case UC-053 – Coach Verification & Certification Tracking (REQ-053)
Initiating Actor: Staff
Goal: Review and approve coach certifications with expiry alerts.
Participating Actors: System, Coach
Preconditions: Coach submitted documents.
Postconditions: Certification status updated.
Main Success Scenario:
 1. Staff views pending certifications.
 2. Opens document & reviews.
 3. Approves & sets expiry date.
 4. System schedules renewal reminder.
 5. Coach notified of approval.
Alternate Flows:
 a. Document invalid -> Rejection reason sent.
 b. Expiry approaching -> System sends alerts.
 c. Renewal not submitted -> Certification lapses; coach limited.
================================================================
Use Case UC-054 – System Monitoring & Analytics (REQ-054)
Initiating Actor: Staff / Admin
Goal: Observe operational metrics & health.
Participating Actors: System
Preconditions: Monitoring endpoints active.
Postconditions: Insights gathered; incidents maybe opened.
Main Success Scenario:
 1. Staff opens Ops dashboard.
 2. System shows real-time metrics.
 3. Staff filters by component.
 4. Identifies anomalies; opens incident.
 5. System logs investigation steps.
Alternate Flows:
 a. Metric stale -> System marks outdated.
 b. Dashboard timeout -> Staff retries; fallback minimal view.
 c. Incident resolved -> Status closed & report archived.
================================================================
Use Case UC-055 – Track Energy Levels (REQ-055)
Initiating Actor: Client
Goal: Log daily energy (1-5) for correlation.
Participating Actors: System
Preconditions: Daily log open.
Postconditions: Energy rating stored; analytics updated.
Main Success Scenario:
 1. Client selects energy rating.
 2. System validates range.
 3. Saves rating.
 4. Recalculates correlations.
 5. Updates wellness visualization.
Alternate Flows:
 a. Missing rating -> Prompt before submission.
 b. Out-of-range -> Reject.
 c. Edit previous day -> Allowed within grace period.
================================================================
Use Case UC-056 – Mood & Stress Monitoring (REQ-056)
Initiating Actor: Client
Goal: Log mood and stress ratings for insights.
Participating Actors: System
Preconditions: Client authenticated.
Postconditions: Ratings saved; trend lines updated.
Main Success Scenario:
 1. Client enters mood & stress values.
 2. System validates & stores.
 3. Analytics update correlation with adherence.
 4. Alert generated if sustained low mood.
 5. Dashboard shows updated chart.
Alternate Flows:
 a. Multiple entries/day -> System averages or stores latest.
 b. Alert dismissed -> System records dismissal.
 c. Extreme value -> Suggests contacting coach.
================================================================
Use Case UC-057 – Sleep & Water Intake Tracking (REQ-057)
Initiating Actor: Client
Goal: Record sleep hours & water consumption.
Participating Actors: System
Preconditions: Daily log accessible.
Postconditions: Metrics stored; recommendations possibly updated.
Main Success Scenario:
 1. Client inputs sleep & water data.
 2. System validates numeric ranges.
 3. Compares vs goals.
 4. Generates recommendation message.
 5. Updates hydration & recovery charts.
Alternate Flows:
 a. Implausible value -> Rejection & tooltip.
 b. Missing sleep data -> Reminder next morning.
 c. Exceeds water goal -> System notes overage warning.
================================================================
Use Case UC-058 – Milestone Tracking & Badges (REQ-058)
Initiating Actor: System / Client
Goal: Award achievements on milestone completion.
Participating Actors: System, Coach
Preconditions: Defined milestones & tracking active.
Postconditions: Badge awarded; milestone closed.
Main Success Scenario:
  1. System evaluates milestone criteria.
 2. Detects completion.
 3. Awards badge & updates profile.
 4. Sends notification to client (and coach).
 5. Logs achievement.
Alternate Flows:
 a. Manual verification required -> Pending state.
 b. Premature claim -> Rejected with reason.
 c. Duplicate detection -> Second award suppressed.
================================================================
Use Case UC-059 – Comprehensive Data Validation (REQ-059)
Initiating Actor: System
Goal: Enforce validation across inputs & data integrity.
Participating Actors: System
Preconditions: User submits data.
Postconditions: Valid data persisted or user alerted.
Main Success Scenario:
 1. Data received via form/API.
 2. Schema & business rules applied.
 3. Sanitization performed.
 4. Valid data saved.
 5. Audit entry recorded for critical fields.
Alternate Flows:
 a. Validation failure -> Errors returned.
 b. Sanitization alters input -> User informed (if visible field).
 c. High-risk pattern -> Entry blocked & flagged.
================================================================
Use Case UC-060 – Database Query Optimization & Caching (REQ-060)
Initiating Actor: Admin / System
Goal: Optimize slow queries using caching & indexing.
Participating Actors: System, Database
Preconditions: Monitoring identifies slow queries.
Postconditions: Optimizations applied; performance logs updated.
Main Success Scenario:
 1. System flags slow query pattern.
 2. Admin reviews performance report.
 3. Adds index or caching rule.
 4. System deploys migration/cache invalidation.
 5. Metrics confirm improved response time.
Alternate Flows:
 a. Index creation failure -> Rollback & alert.
 b. Cache staleness -> TTL expires; refresh triggered.
 c. Optimization regression -> Revert changes.
================================================================
Use Case UC-061 – Delete Plan Template with Dependency Check (REQ-061)
Initiating Actor: Coach
Goal: Remove unused plan template safely.
Participating Actors: System
Preconditions: Template exists; coach owner.
Postconditions: Template deleted or blocked.
Main Success Scenario:
 1. Coach selects template -> Delete.
 2. System checks active dependencies.
 3. No dependencies found.
 4. Template soft-deleted.
 5. Confirmation displayed.
Alternate Flows:
 a. Active subscriptions -> Deletion blocked; list shown.
 b. Soft delete restore request -> Coach reactivates.
 c. Hard purge after retention -> System permanently removes.
================================================================
Use Case UC-062 – Pause / Resume Active Plan (REQ-062)
Initiating Actor: Client
Goal: Temporarily suspend plan progress tracking.
Participating Actors: System, Coach (notified)
Preconditions: PlanSubscription Active.
Postconditions: Plan status Paused or Active resumed.
Main Success Scenario:
 1. Client opens plan settings.
 2. Clicks Pause; selects reason & duration.
 3. System updates status & freezes streak calculations.
 4. Coach notified.
 5. Client later selects Resume; system reinstates tracking.
Alternate Flows:
 a. Pause beyond max duration -> System limits & informs.
 b. Resume before planned -> Allowed; schedule recalculated.
 c. Auto-resume date reached -> System resumes plan.
================================================================
Use Case UC-063 – Bulk Plan Assignment (REQ-063)
Initiating Actor: Coach
Goal: Assign one template to multiple clients with minor customizations.
Participating Actors: System, Clients
Preconditions: Template exists; selected clients active.
Postconditions: Multiple PlanSubscriptions created.
Main Success Scenario:
 1. Coach selects clients list.
 2. Chooses template & shared parameters.
 3. Optionally applies per-client overrides.
 4. System validates & creates subscriptions.
 5. Clients notified collectively.
Alternate Flows:
 a. Some clients conflict -> Partial success report.
 b. Rate limit -> Batch queued.
 c. Override error -> Specific client skipped & logged.
================================================================
Use Case UC-064 – Plan Completion Certificates (REQ-064)
Initiating Actor: System / Coach
Goal: Generate certificate upon plan completion.
Participating Actors: System, Client
Preconditions: Plan status Completed; criteria met.
Postconditions: Certificate generated & accessible.
Main Success Scenario:
 1. System detects completion.
 2. Validates adherence threshold.
 3. Generates certificate PDF.
 4. Stores & notifies client.
 5. Client downloads/share link.
Alternate Flows:
 a. Threshold not met -> Coach may approve override.
 b. Generation failure -> Retry queued.
 c. Certificate revoked (error) -> Regenerate new version.
================================================================
Use Case UC-065 – Email Notifications for Important Events (REQ-065)
Initiating Actor: System
Goal: Send templated email for key events.
Participating Actors: System, Email Service
Preconditions: Event triggers & email opted-in.
Postconditions: Email delivered or queued.
Main Success Scenario:
 1. Event (plan assigned) fires.
 2. System selects appropriate template.
 3. Merges dynamic data.
 4. Sends email & records status.
 5. Bounce handling updates log.
Alternate Flows:
 a. Template missing -> Fallback generic template.
 b. Email failure -> Retry then escalate.
 c. User unsubscribed -> Suppress email.
================================================================
Use Case UC-066 – Clone & Modify Plan Template (REQ-066)
Initiating Actor: Coach
Goal: Create new template by cloning existing.
Participating Actors: System
Preconditions: Source template exists.
Postconditions: New cloned template saved (Draft).
Main Success Scenario:
 1. Coach selects template -> Clone.
 2. System copies structure & metadata.
 3. Coach edits fields.
 4. Saves draft then publishes.
 5. Template appears in library.
Alternate Flows:
 a. Clone name conflict -> System suggests suffix.
 b. Partial copy failure -> Rollback & alert.
 c. Coach cancels -> No new template created.
================================================================
Use Case UC-067 – Fitness Device Integration (REQ-067)
Initiating Actor: Client
Goal: Connect wearable device for auto-sync data.
Participating Actors: System, External Device API
Preconditions: Device supported; API credentials configured.
Postconditions: OAuth token stored; sync scheduled.
Main Success Scenario:
 1. Client selects "Connect Device".
 2. Redirects to device OAuth consent.
 3. Client authorizes.
 4. System receives token & stores securely.
 5. Initial sync job enqueued.
Alternate Flows:
 a. Authorization denied -> Connection aborted.
 b. Token refresh failure -> System requests re-auth.
 c. Partial data -> System retries missing ranges.
================================================================
Use Case UC-068 – Weekly & Monthly Progress Summaries (REQ-068)
Initiating Actor: System / Client
Goal: Compile periodic summaries with comparisons.
Participating Actors: System
Preconditions: Historical data spans period.
Postconditions: Summary generated & viewable.
Main Success Scenario:
 1. Scheduler runs summary job.
 2. Aggregates weekly/monthly metrics.
 3. Compares vs prior periods.
 4. Stores summary & notifies user.
 5. Client views report panel.
Alternate Flows:
 a. Data incomplete -> System notes partial.
 b. Client opts out -> Report suppressed.
 c. Report regeneration -> Overwrites prior.
================================================================
Use Case UC-069 – Secure Password Reset (REQ-069)
Initiating Actor: User
Goal: Reset forgotten password securely.
Participating Actors: System, Email Service
Preconditions: Email registered.
Postconditions: Password updated; old tokens revoked.
Main Success Scenario:
 1. User initiates password reset.
 2. System sends secure link (token + expiry).
 3. User opens link & enters new password.
 4. System validates complexity & saves hash.
 5. Logs out all sessions; confirms success.
Alternate Flows:
 a. Invalid/expired token -> System prompts new request.
 b. Weak password -> Rejected with guidance.
 c. Multiple requests -> Only latest token valid.
================================================================
Use Case UC-070 – Dashboard Preference Customization (REQ-070)
Initiating Actor: User
Goal: Configure dashboard layout & widgets.
Participating Actors: System
Preconditions: User authenticated.
Postconditions: Preferences stored; layout updated.
Main Success Scenario:
 1. User enters customization mode.
 2. Adds/removes/reorders widgets.
 3. Saves changes.
 4. System persists configuration.
 5. Dashboard reloads with new layout.
Alternate Flows:
 a. Widget load failure -> Placeholder shown.
 b. Exceeds widget limit -> System blocks addition.
 c. Reset to default -> Original layout restored.
================================================================
Use Case UC-071 – Workout Video Integration (REQ-071)
Initiating Actor: Client
Goal: Play workout videos with progress tracking.
Participating Actors: System, Media Service
Preconditions: Video linked to exercise.
Postconditions: Playback progress saved.
Main Success Scenario:
 1. Client opens exercise detail.
 2. Starts video playback.
 3. System tracks watch percentage.
 4. Upon completion marks exercise viewed.
 5. Updates learning progress.
Alternate Flows:
 a. Bandwidth low -> Lower resolution stream.
 b. Mid-video exit -> Progress saved at timestamp.
 c. DRM failure -> Retry or alternate video.
================================================================
Use Case UC-072 – Nutrition Database Access (REQ-072)
Initiating Actor: Client / Coach
Goal: Search foods & retrieve nutritional data.
Participating Actors: System, Nutrition Data Service
Preconditions: Database populated.
Postconditions: Data displayed; selected item added to meal.
Main Success Scenario:
 1. User searches food.
 2. System queries nutrition index.
 3. Displays matching items.
 4. User selects & adjusts serving.
 5. Item added to meal log.
Alternate Flows:
 a. No result -> Option to create custom food.
 b. API rate limit -> Cached results served.
 c. Incomplete data -> Mark partial & allow edit.
================================================================
Use Case UC-073 – Recipe Creation & Sharing (REQ-073)
Initiating Actor: Client / Coach
Goal: Build recipe with nutritional calculation.
Participating Actors: System
Preconditions: Ingredients available in DB.
Postconditions: Recipe stored; nutrients computed.
Main Success Scenario:
 1. User starts new recipe.
 2. Adds ingredients & quantities.
 3. System calculates total & per serving nutrition.
 4. User saves; sets visibility.
 5. Recipe available for meal logging.
Alternate Flows:
 a. Missing ingredient -> Add custom ingredient.
 b. Fractional serving -> System recalculates per serving.
 c. Privacy change -> System updates sharing access.
================================================================
Use Case UC-074 – Social Achievement Sharing (REQ-074)
Initiating Actor: Client
Goal: Share achievement to social/feed.
Participating Actors: System, Social API (optional)
Preconditions: Achievement earned & sharing enabled.
Postconditions: Post created internally / externally.
Main Success Scenario:
 1. Client views achievement; selects Share.
 2. Chooses platforms (internal feed / external).
 3. System formats post.
 4. Publishes internally & sends external API.
 5. Confirms success.
Alternate Flows:
 a. External API error -> Internal post only; notify user.
 b. Privacy restriction -> Share blocked.
 c. Duplicate share -> System prevents repeat spam.
================================================================
Use Case UC-075 – Calendar Integration (REQ-075)
Initiating Actor: Client / Coach
Goal: Schedule workouts/meals on calendar.
Participating Actors: System, Calendar Service
Preconditions: Plan exists.
Postconditions: Events created/updated.
Main Success Scenario:
 1. User opens calendar view.
 2. Drags workouts/meals into calendar slots.
 3. System creates calendar events.
 4. Syncs with external calendar if linked.
 5. Reminders scheduled.
Alternate Flows:
 a. Overlap conflict -> System prompts resolve.
 b. External sync failure -> Retry queued.
 c. Timezone change -> Events adjusted.
================================================================
Use Case UC-076 – Backup & Multi-Device Sync (REQ-076)
Initiating Actor: System
Goal: Keep user data synchronized across devices.
Participating Actors: System
Preconditions: User uses multiple devices.
Postconditions: Consistent latest data on all devices.
Main Success Scenario:
 1. Device submits updates.
 2. System merges & timestamps changes.
 3. Pushes delta to other devices.
 4. Conflicts resolved via latest-write or merge rules.
 5. Sync status displayed.
Alternate Flows:
 a. Conflict unresolved -> User prompted manual selection.
 b. Offline device -> Sync queued until online.
 c. Version mismatch -> Full resync triggered.
================================================================
Use Case UC-077 – Offline Mode Access (REQ-077)
Initiating Actor: Client
Goal: Use basic plan & logging without connectivity.
Participating Actors: System (local cache)
Preconditions: Data cached prior to offline state.
Postconditions: Offline actions queued for sync.
Main Success Scenario:
 1. Client loses network.
 2. System switches to offline mode.
 3. User views cached plan & logs activities.
 4. System queues logs locally.
 5. Upon reconnection, sync executes.
Alternate Flows:
 a. Cache expired -> Minimal summary only.
 b. Sync conflict -> Merge rules applied.
 c. Prolonged offline -> Warn about stale data.
================================================================
Use Case UC-078 – Comprehensive Content Search (REQ-078)
Initiating Actor: User
Goal: Search across coaches, plans, recipes, media.
Participating Actors: System, Search Index
Preconditions: Index built.
Postconditions: Ranked results displayed.
Main Success Scenario:
 1. User enters query.
 2. System parses & queries index.
 3. Faceted results returned.
 4. User filters/refines.
 5. Opens selected result.
Alternate Flows:
 a. No matches -> Suggestions displayed.
 b. Query too broad -> Prompt for filters.
 c. Index rebuilding -> Serve stale index with notice.
================================================================
Use Case UC-079 – Coaching Analytics (REQ-079)
Initiating Actor: Coach
Goal: Analyze business KPIs & client metrics.
Participating Actors: System
Preconditions: Sufficient client data.
Postconditions: Insights viewed.
Main Success Scenario:
 1. Coach opens Analytics.
 2. Selects period & KPIs.
 3. System aggregates metrics.
 4. Visualizations rendered.
 5. Coach exports report.
Alternate Flows:
 a. Sparse data -> Limited metrics shown.
 b. Export failure -> Retry or different format.
 c. KPI formula update -> System version labels.
================================================================
Use Case UC-080 – Multi-Language Interface (REQ-080)
Initiating Actor: User
Goal: Switch platform language.
Participating Actors: System
Preconditions: Locales available.
Postconditions: UI rendered in chosen language.
Main Success Scenario:
 1. User opens Language Settings.
 2. Selects desired locale.
 3. System loads translation bundle.
 4. Re-renders interface.
 5. Preference saved.
Alternate Flows:
 a. Missing translation -> Fallback to default.
 b. RTL language -> Layout mirrored.
 c. Cache stale -> Bundle refreshed.
================================================================
Use Case UC-081 – Role-Based Dashboard Customization (REQ-081)
Initiating Actor: System / User
Goal: Provide distinct default dashboards per role.
Participating Actors: System
Preconditions: User role known.
Postconditions: Appropriate widgets displayed.
Main Success Scenario:
 1. User logs in.
 2. System detects role.
 3. Loads role-specific layout.
 4. Applies user overrides.
 5. Dashboard shown.
Alternate Flows:
 a. Missing role layout -> Default layout applied.
 b. Deprecated widget -> Replaced with fallback.
 c. Permission change -> Dashboard recalculated.
================================================================
Use Case UC-082 – Public API Endpoints (REQ-082)
Initiating Actor: External App Developer
Goal: Access platform data via authenticated API.
Participating Actors: System, OAuth Service
Preconditions: API credentials issued.
Postconditions: Data retrieved within scope limits.
Main Success Scenario:
 1. Developer authenticates via OAuth.
 2. Receives access token.
 3. Calls endpoint (e.g., /plans, /progress).
 4. System validates scope & rate limits.
 5. Returns JSON response.
Alternate Flows:
 a. Expired token -> 401 & refresh flow.
 b. Rate limit exceeded -> 429 response.
 c. Unauthorized scope -> 403 denied.
================================================================
Use Case UC-083 – Automated Plan Suggestions (REQ-083)
Initiating Actor: System
Goal: Suggest new plans based on client progress.
Participating Actors: System, Client, Coach
Preconditions: Progress history & recommendation engine active.
Postconditions: Suggestions queued/displayed.
Main Success Scenario:
 1. Scheduler evaluates clients weekly.
 2. Engine analyzes adherence & goals.
 3. Generates list of plan suggestions.
 4. Client notified; can view details.
 5. Coach approves & assigns if desired.
Alternate Flows:
 a. No suitable match -> Suggest consultation.
 b. Engine error -> No suggestions this cycle.
 c. Client dismisses -> Feedback stored to refine model.
================================================================
Use Case UC-084 – Group Coaching Features (REQ-084)
Initiating Actor: Coach
Goal: Manage group sessions for multiple clients.
Participating Actors: System, Clients
Preconditions: Group feature enabled.
Postconditions: Group session scheduled & tracked.
Main Success Scenario:
 1. Coach creates group program.
 2. Adds clients.
 3. Schedules sessions.
 4. System notifies participants.
 5. Attendance & progress tracked.
Alternate Flows:
 a. Client declines invite -> Removed from roster.
 b. Capacity reached -> Waitlist created.
 c. Session canceled -> Notifications sent.
================================================================
Use Case UC-085 – Comprehensive Audit Logging (REQ-085)
Initiating Actor: System
Goal: Record security-sensitive operations.
Participating Actors: System, Admin
Preconditions: Logging framework active.
Postconditions: Immutable audit records stored.
Main Success Scenario:
 1. Sensitive action invoked (role change, data export).
 2. System captures context (user, timestamp, IP).
 3. Writes to append-only log.
 4. Integrity hash updated.
 5. Admin can query logs.
Alternate Flows:
 a. Log write failure -> Fallback buffer & alert.
 b. Tamper detection -> Alert & lockdown.
 c. Log rotation -> Archive & compress.
================================================================
Use Case UC-086 – Smart Adaptive Notifications (REQ-086)
Initiating Actor: System
Goal: Adjust notification timing & frequency by behavior.
Participating Actors: System, User
Preconditions: Notification history available.
Postconditions: Personalized notification schedule updated.
Main Success Scenario:
 1. System analyzes user response patterns.
 2. Updates notification cadence model.
 3. Schedules next reminders optimally.
 4. Sends notifications.
 5. Captures interaction feedback (open/click time).
Alternate Flows:
 a. No pattern -> Default schedule retained.
 b. High opt-outs -> Reduce frequency automatically.
 c. User manual override -> Model respects override.
================================================================
Use Case UC-087 – Plan Sharing Between Coaches (REQ-087)
Initiating Actor: Coach
Goal: Share template with another coach with permissions.
Participating Actors: System, Other Coach
Preconditions: Template exists; sharing allowed.
Postconditions: Share link/permission record created.
Main Success Scenario:
 1. Coach selects template -> Share.
 2. Chooses recipient & permission (view/clone).
 3. System creates sharing record.
 4. Recipient notified & accesses template.
 5. Usage logged.
Alternate Flows:
 a. Permission upgrade -> System updates record.
 b. Revoke share -> Access removed.
 c. Recipient clone -> Independent copy created.
================================================================
Use Case UC-088 – White-Label Customization (REQ-088)
Initiating Actor: Admin
Goal: Configure branding (logo, colors, domain) for business.
Participating Actors: System
Preconditions: White-label feature licensed.
Postconditions: Branding applied tenant-wide.
Main Success Scenario:
 1. Admin opens branding settings.
 2. Uploads logo & selects colors.
 3. System validates contrast & formats.
 4. Saves & purges style cache.
 5. Branded UI rendered.
Alternate Flows:
 a. Invalid logo size -> Reject & request resize.
 b. Low contrast -> Warning; admin confirms override.
 c. Domain mapping pending -> Temporary subdomain used.
================================================================
Use Case UC-089 – Error Handling & User-Friendly Messages (REQ-089)
Initiating Actor: System
Goal: Capture errors and present clear messages.
Participating Actors: System, User, Logging Service
Preconditions: Error handling middleware configured.
Postconditions: Error logged; user receives guidance.
Main Success Scenario:
 1. Exception occurs.
 2. Middleware captures & categorizes.
 3. Logs technical details (hidden from user).
 4. User shown friendly message & retry option.
 5. Alert raised if severity high.
Alternate Flows:
 a. Repeated error -> System throttles alerts.
 b. Unhandled type -> Fallback generic handler.
 c. User reports issue -> Ticket auto-created.
================================================================
Use Case UC-090 – Automated Testing & QA for Plan Effectiveness (REQ-090)
Initiating Actor: QA Staff / System CI
Goal: Run automated tests validating plan logic & metrics.
Participating Actors: System, Test Suite
Preconditions: Test scenarios defined.
Postconditions: Test results stored; failures reported.
Main Success Scenario:
 1. CI pipeline triggered (commit/schedule).
 2. Test suite runs plan scenario cases.
 3. System collects pass/fail & coverage.
 4. Generates report & notifies team.
 5. Failing tests block deployment.
Alternate Flows:
 a. Flaky test -> Mark quarantined; alert QA.
 b. Coverage below threshold -> Build flagged.
 c. Environment failure -> Rerun after environment reset.
================================================================

End of Use Case Catalogue.
