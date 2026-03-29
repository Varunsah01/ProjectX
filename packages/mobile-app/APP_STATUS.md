# Field Operator App Status

This document covers the current state of the mobile field operator app only.

## Completed

- [x] Expo-based Android-first mobile app shell is in place.
- [x] Splash/session-restore entry flow is wired through the existing auth provider.
- [x] Login flow supports phone number or employee ID input.
- [x] Login flow supports password or OTP-style second input.
- [x] Inline validation, loading states, and error states are present in the login screen.
- [x] Session persistence is implemented on device with `expo-secure-store`.
- [x] Authenticated app shell is working with Home, Job List, Job Detail, Update Status, Add Notes, Upload Proof, Close Job, and Profile flows.
- [x] Navigation params are typed using the current manual route-stack approach.
- [x] Home / Job List screen includes:
  - [x] operator header
  - [x] summary cards
  - [x] Today / Upcoming / Overdue tabs
  - [x] job cards
  - [x] loading, empty, and error states
  - [x] pull to refresh
- [x] Job Detail screen shows core operator information:
  - [x] customer name
  - [x] phone
  - [x] address
  - [x] service type
  - [x] issue summary
  - [x] scheduled time
  - [x] priority
  - [x] status
  - [x] internal notes
  - [x] optional asset details
- [x] Job Detail actions are implemented:
  - [x] Call Customer
  - [x] Open in Maps
  - [x] Update Status
  - [x] Add Notes
  - [x] Upload Proof
  - [x] Close Job
- [x] Update Status flow supports:
  - [x] assigned
  - [x] on_the_way
  - [x] arrived
  - [x] work_started
  - [x] completed
  - [x] rescheduled
  - [x] failed
- [x] Update Status flow enforces typed validation and valid next transitions.
- [x] Add Notes / Service Report screen supports service notes, issue type, work done, and follow-up required.
- [x] Upload Proof flow supports:
  - [x] camera capture
  - [x] gallery pick
  - [x] preview
  - [x] remove
  - [x] retake
  - [x] proof type selection
- [x] Final job outcome flow supports completed, failed, and rescheduled outcomes.
- [x] Profile screen shows operator name, phone, role, app version, and logout.
- [x] Shared TypeScript app domain models are defined for `User`, `Job`, `JobUpdate`, `JobProof`, and `JobClosure`.
- [x] App services are typed and use the current backend integration rather than a new architecture.
- [x] Basic offline-safe support exists for:
  - [x] pending job status updates
  - [x] pending notes saves
  - [x] pending closure submissions
  - [x] pending proof metadata / upload work
- [x] Ordered replay for pending actions is implemented.
- [x] Duplicate-submit protection has been improved in core job flows.
- [x] Weak-network behavior has been improved for session restore and sync replay.
- [x] Android-first release config has been improved:
  - [x] Android-only Expo platform config
  - [x] Android package id
  - [x] adaptive icon config
  - [x] splash config
  - [x] local placeholder icon/splash assets added so builds do not point at missing files
- [x] Obvious mobile debug/test copy was removed from the sign-in flow.
- [x] Non-dev builds now require `EXPO_PUBLIC_API_URL` instead of silently falling back to localhost behavior.

## Incomplete Or Partially Done

- [ ] OTP is still not a production-ready verification flow.
  The app UI supports it, but it still depends on a stubbed backend path and should not be treated as final auth.
- [ ] App branding assets are build-safe placeholders, not final branded release assets.
- [ ] Scheduled time / slot display is still partly based on fallback service-window data where backend scheduling detail is limited.
- [ ] Proof upload works in the current setup, but long-term storage strategy is not finalized from the app release perspective.
- [ ] The current manual route-stack navigation is workable and typed, but it is still a lightweight custom shell rather than a full navigation library.
- [ ] Complaints screens exist, but the job workflow has received more release-hardening than the complaints side.

## Remaining To Complete

- [ ] Run full Android device testing for:
  - [ ] fresh sign-in
  - [ ] reopen with saved session
  - [ ] hardware back behavior
  - [ ] weak/offline network behavior
  - [ ] camera capture
  - [ ] gallery pick
  - [ ] proof upload retry behavior
- [ ] Set `EXPO_PUBLIC_API_URL` in the internal build environment.
- [ ] Decide whether internal testers will use password-only login or whether OTP will be completed first.
- [ ] Replace the placeholder icon and splash art with final pilot branding if branding quality matters for pilot distribution.
- [ ] Build and test the internal Android package with real backend connectivity.
- [ ] Confirm release permissions behavior on a real Android device, especially for camera and gallery flows.

## Short Readiness Summary

- Done: the app is functionally usable for pilot-style field workflows across sign-in, assigned jobs, detail view, status updates, notes, proof capture, closure, profile, and basic offline-safe behavior.
- Incomplete: a few release-quality items are still partial, mainly OTP readiness, final branding assets, and some backend-dependent display details.
- Remaining: the biggest remaining work is real Android device validation and internal build configuration, not new app feature development.
