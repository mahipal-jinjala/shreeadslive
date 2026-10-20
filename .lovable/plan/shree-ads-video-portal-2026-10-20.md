# SHREE ADS Video Portal

## Goal
Build a usable full-stack video-course portal from the supplied brief, using real Cloud-backed accounts and course/payment data rather than placeholder records.

## Build plan
1. Enable Lovable Cloud and configure the requested student profiles and authentication without placing credentials in source code.
2. Add the student/admin account model, course catalog, videos, payment requests, and per-course access with database constraints, grants, RLS, and private storage.
3. Build the public catalog and course pages, student sign-in/sign-up and dashboard, and role-separated admin workspace.
4. Implement UPI payment instructions, private proof upload, review status, admin approval/rejection, and course-specific access.
5. Verify route behavior, key application flows where the configured services permit, and preview/build diagnostics; document any setup that requires the account owner.

## Security and boundaries
- Roles are held separately from profile data and checked by trusted database policies; hidden UI is not the security boundary.
- Payment proofs and paid video files remain private; opening a UPI app or submitting proof never counts as approval.
- Use the provided UPI and WhatsApp contact details; do not seed fake courses or hard-code the supplied admin password.
- Mobile-number sign-in must not expose account email addresses; if the available Cloud authentication settings cannot support the requested no-OTP behavior safely, keep the secure sign-in path and document the limitation rather than weakening access.

## Technical approach
- TanStack Start routes and React UI with the existing Tailwind/shadcn design system.
- Lovable Cloud for Auth, Postgres, and Storage; public course reads and private student/admin operations enforced by RLS and authenticated server functions as appropriate.
- Separate protected route areas for students and administrators, with a public catalog at `/`.