# Field Operator Android App Build Plan
## Android-first app for technician / rider / field operator workflows

## 1. What this app is
This is the field-execution app for the person who actually visits, calls, services, installs, collects, or closes the work at the customer end.

This app is **not** the full business platform. It is only the Android app used by:
- technicians
- riders
- field service agents
- collection agents
- installation staff
- on-ground operators

Its job is simple: help the field person see assigned work, take action, update status, and close jobs properly.

---

## 2. v1 product goal
Build the smallest Android app that lets a field operator:
1. log in
2. see assigned jobs
3. view customer and location details
4. start and update a job
5. upload proof
6. add notes
7. collect simple confirmation
8. close the task

If this flow works smoothly, the app is useful. If this flow breaks, nothing else matters.

---

## 3. What to build first
## v1 feature set

### A. Login
- phone number / OTP login or admin-issued credentials
- persistent login session
- logout

### B. Job list
- today’s jobs
- upcoming jobs
- overdue jobs
- basic filters by status

### C. Job detail
- customer name
- phone number
- address
- service type
- issue summary
- scheduled time
- notes from ops team
- asset or installation details if relevant

### D. Job actions
- call customer
- open address in maps
- mark on the way
- mark arrived
- mark work started
- mark completed
- mark failed / rescheduled

### E. Proof and notes
- add service notes
- upload photos
- capture customer signature or OTP confirmation later
- record failure reason if unresolved

### F. Sync
- send job updates to server
- store pending updates locally if internet is weak

### G. Profile / settings
- operator name
- role
- logout

---

## 4. Exact screen map
Build these screens in this order.

### Screen 1: Splash / session check
**Purpose**  
Checks whether the user is already logged in.

**UI**
- logo
- loading spinner
- redirect to Login or Home

**Logic**
- check saved auth token
- if token exists and valid, go to Home
- else go to Login

### Screen 2: Login
**Purpose**  
Authenticate the field operator.

**UI**
- phone number field or employee ID field
- password / OTP input
- login button
- loading state
- error state

**Actions**
- submit login
- save auth token
- redirect to Home

**v1 note**  
Use the simplest auth flow possible. Do not overcomplicate onboarding at this stage.

### Screen 3: Home / Job list
**Purpose**  
Main operating screen.

**UI blocks**
- top header with user name
- status summary cards:
  - assigned
  - in progress
  - completed
  - overdue
- job list tabs:
  - today
  - upcoming
  - overdue
- each job card shows:
  - customer name
  - service type
  - time slot
  - location snippet
  - status badge
  - primary action button

**Actions**
- tap job to open details
- pull to refresh
- filter by status
- search by customer or phone later

### Screen 4: Job detail
**Purpose**  
Single source of truth for one service task.

**UI blocks**
- customer card
  - name
  - phone
  - address
- job card
  - service type
  - status
  - assigned time
  - priority
- issue / complaint summary
- asset details if relevant
- internal notes
- action buttons

**Action buttons**
- Call Customer
- Open in Maps
- Update Status
- Add Notes
- Upload Proof
- Close Job

### Screen 5: Update status
**Purpose**  
Let the operator move the job through the workflow.

**Status flow**
- assigned
- on the way
- arrived
- work started
- completed
- rescheduled
- failed

**UI**
- current status
- selectable next status
- optional comment box
- save button

**Validation**
- failed and rescheduled must require a reason
- completed must require service notes or proof in many cases

### Screen 6: Add notes / service report
**Purpose**  
Capture what happened on the ground.

**UI**
- multi-line text area
- issue type dropdown
- work done dropdown or text
- parts used field later
- follow-up required toggle
- save button

**Data captured**
- service notes
- visit summary
- issue observed
- next action needed

### Screen 7: Upload proof
**Purpose**  
Show real closure evidence.

**UI**
- open camera
- upload from gallery
- image preview
- remove / retake
- save button

**v1 proof types**
- before photo
- after photo
- installation proof
- closure photo

### Screen 8: Complete / fail / reschedule job
**Purpose**  
Finalize outcome.

**Completed flow UI**
- closure notes
- proof attached?
- customer confirmation checkbox
- submit completion

**Failed flow UI**
- failure reason
- optional photo
- optional next recommended date

**Reschedule flow UI**
- reason
- preferred new date / slot
- submit

### Screen 9: Profile / settings
**Purpose**  
Basic user controls.

**UI**
- name
- phone
- role
- app version
- logout

---

## 5. Recommended app architecture
## Best no-BS starting stack

### Frontend
- React Native
- Expo
- TypeScript

### State management
- start simple with React Query + Context
- avoid Redux unless the app becomes much bigger

### Backend
- Supabase is the easiest practical path for you  
or
- simple Node.js backend with PostgreSQL

### Storage
- Supabase storage or S3-compatible storage for photos

### Maps
- start with “Open in Google Maps” deep linking
- do not embed maps in v1

### Notifications
- skip push notifications in the first build unless they are essential

### Offline
- AsyncStorage or SQLite for pending drafts and local cached jobs

---

## 6. Suggested folder structure

```text
src/
  app/
  components/
  screens/
    auth/
    jobs/
    profile/
  services/
    api/
    auth/
    storage/
  hooks/
  utils/
  types/
  constants/
```

Keep the project boring and clean. Do not over-engineer.

---

## 7. Data models for v1

### User
- id
- name
- phone
- role
- active_status

### Job
- id
- customer_name
- customer_phone
- address
- latitude
- longitude
- service_type
- issue_summary
- scheduled_at
- priority
- status
- technician_id
- internal_notes

### JobUpdate
- id
- job_id
- status
- note
- created_at
- synced

### JobProof
- id
- job_id
- image_url
- proof_type
- uploaded_at

### JobClosure
- id
- job_id
- closure_type
- closure_note
- failure_reason
- reschedule_date
- customer_confirmation_type

---

## 8. Build order

### Stage 1: setup
**Goal**  
Get a running Android project.

**Tasks**
- install Node.js
- install VS Code
- install Git
- create Expo app
- run app on real Android phone
- set up GitHub repo
- install Android Studio for emulator later

**Output**  
A working blank app running on your phone.

### Stage 2: UI-only prototype
**Goal**  
Build the full app flow with dummy data.

**Tasks**
- create navigation
- build Login screen
- build Home / Job list
- build Job detail
- build Update status screen
- build Notes screen
- build Upload proof screen
- build Completion flow
- use hardcoded JSON for jobs

**Output**  
A clickable app that feels real even without backend.

**Why this matters**  
Validate the flow before touching backend complexity.

### Stage 3: backend integration
**Goal**  
Make the app actually work.

**Tasks**
- set up auth
- create jobs table
- fetch assigned jobs
- send status updates
- upload photos
- save notes
- save closure state

**Output**  
A functional app with real data.

### Stage 4: field robustness
**Goal**  
Make the app usable in bad real-world conditions.

**Tasks**
- loading states
- error states
- retry logic
- pending sync queue
- offline draft save
- image upload failure handling
- session persistence

**Output**  
A field-usable app, not just a demo.

### Stage 5: pilot readiness
**Goal**  
Prepare for real user rollout.

**Tasks**
- clean copy and labels
- improve status rules
- prevent bad submissions
- add app icon and splash
- create internal Android build
- onboard 2 to 5 real users

**Output**  
Pilot app ready for internal testing.

---

## 9. Testing checklist

### Functional testing
- login works
- logout works
- job list loads
- job detail loads
- status updates save
- notes save
- proof uploads save
- completion flow works

### Edge-case testing
- no internet
- slow internet
- image upload failure
- app kill and reopen
- duplicate button taps
- expired auth session
- empty job list

### Real-life field testing
- open maps from app
- call customer from app
- add notes while moving
- upload photos on weak network
- complete job in under 30 seconds

A field operator app must be fast and idiot-proof.

---

## 10. How to test and ship on Android

Start local testing on your own Android phone with Expo Go while building the early UI.  
When you need more realistic app behavior or custom native support, move to an Expo development build using EAS Build.

For launch preparation, create an Android App Bundle for Google Play.

Before public launch, use Google Play’s internal testing track.

---

## 11. Exact 4-week execution plan

### Week 1
- set up environment
- create Expo app
- create navigation
- build Login
- build Job list
- build Job detail

### Week 2
- build status flow
- build notes screen
- build proof upload UI
- build completion and failure flow
- test with dummy data

### Week 3
- connect backend
- add auth
- fetch jobs
- save updates
- upload proof

### Week 4
- add offline draft support
- fix rough edges
- create internal Android build
- test with 2 to 3 real operators
- collect feedback and cut unnecessary features

---

## 12. What not to build right now
Do not build in v1:
- customer-facing app
- live GPS tracking
- route optimization
- in-app chat
- advanced analytics
- inventory management
- payment gateway inside app
- push notification complexity
- deep customization engine

That is how you lose focus.

---

## 13. Final founder rule
Your first win is not “a complete app.”

Your first win is:

**one field operator using the app end-to-end for a real job without confusion.**

That is the milestone. Once that works, everything else becomes easier.
