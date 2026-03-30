# Android Device Test Checklist

Use this checklist against a real Android device build of the Expo app.

## Preflight

- [ ] `EXPO_PUBLIC_API_URL` points to a backend reachable from the device.
- [ ] Test once on Wi-Fi and once on mobile data if field operators will use both.
- [ ] Use password sign-in for the primary validation pass.
- [ ] Keep one pass with weak or disabled network to confirm offline-safe behavior.

## Login Screen

- [ ] Employee ID is the default pilot sign-in identifier.
- [ ] Fresh sign-in with a valid phone number and password succeeds.
- [ ] Fresh sign-in with a valid employee ID and password succeeds.
- [ ] Invalid credentials show a safe error without leaving the screen.
- [ ] OTP is not exposed in the primary pilot sign-in UI.
- [ ] If the build still targets `10.0.2.2`, the warning banner is visible before sign-in.

## Home Screen

- [ ] Reopen the app with a saved session and confirm the operator lands back in the authenticated app shell.
- [ ] With weak network, confirm cached jobs load with a visible stale-data message if fresh fetch fails.
- [ ] Pull to refresh shows loading and returns cleanly when the backend is reachable again.
- [ ] Hardware back from a root tab exits or returns to Home as expected.

## Jobs Screen

- [ ] Open a job from the Jobs tab and return with hardware back.
- [ ] From the Jobs tab root, hardware back returns to Home instead of leaving the app immediately.

## Job Detail Screen

- [ ] Opening a job shows customer, schedule, and proof sections without crashes.
- [ ] Pending sync count appears when offline actions exist for that job.
- [ ] Hardware back returns to the previous screen.

## Update Status Screen

- [ ] Submit a normal status update online.
- [ ] Submit a status update offline or on weak network and confirm it is queued instead of lost.
- [ ] Hardware back is blocked while the submit is in progress.

## Service Report Screen

- [ ] Save notes online.
- [ ] Save notes offline and confirm the action is queued with safe messaging.
- [ ] Hardware back is blocked while save is in progress.

## Upload Proof Screen

- [ ] First camera attempt requests permission and proceeds after allow.
- [ ] Denying camera permission shows a safe error state.
- [ ] Blocking camera permission in Android settings shows a safe error state.
- [ ] First gallery attempt requests permission and proceeds after allow.
- [ ] Denying gallery permission shows a safe error state.
- [ ] Take a photo, preview it, retake it, and remove it before saving.
- [ ] Pick one or more images from the gallery and preview them before saving.
- [ ] Save proof online and confirm the success notice.
- [ ] Save proof on weak/offline network and confirm the proof is saved locally with pending sync.
- [ ] Use `Retry Pending Uploads` after connectivity returns.
- [ ] Reopen the app with a pending proof upload and confirm the retry path still works.
- [ ] Hardware back is blocked while save, retake, or remove is running.

## Job Outcome Screen

- [ ] Complete a job with closure notes and customer confirmation.
- [ ] Fail a visit with a required reason.
- [ ] Reschedule a visit with a valid new date.
- [ ] Submit one outcome while offline and confirm it is queued.
- [ ] Hardware back is blocked while outcome submission is running.

## Profile Screen

- [ ] Sign out clears the session and returns to Login.
- [ ] Reopen after sign-out and confirm the app does not restore the old authenticated session.
