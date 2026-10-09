# Online Counseling Platform — Backend

Node.js + Express + MongoDB backend for the counseling platform (MERN stack).

## Tech Stack
- Runtime: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT + bcryptjs
- Real-time Chat: Socket.io
- Payments: Razorpay 
- Video Calls: Jitsi Meet 
- Emails: Brevo API 

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Client vs. Counselor).
- **Password Reset**: Secure 6-digit OTP email verification for account recovery via Brevo API.
- **Appointment & Slot Management**: Real-time slot reservation and slot release logic on appointment cancellations.
- **Razorpay Integration**: Server-side price calculation, order creation, signature verification, and automated refund processing with manual failover handling.
- **Real-time Chat**: Socket.io real-time messaging with room authorization checks.
- **Session Notes & Attachments**: Counselor session notes and file uploads using Cloudinary / local fallback storage.
- **Email Notifications**: Transactional emails for booking confirmations, cancellations, and password reset codes.


## API Endpoints

**Auth Routes (/api/auth)**
- POST /register - Register new client or counselor
- POST /login - User login & JWT issuance
- POST /forgot-password - Request 6-digit OTP code via email
- POST /reset-password - Verify OTP and update password

**Counselor Routes (/api/counselors)**
- GET / - Fetch all public counselor profiles
- GET /profile - Get authenticated counselor profile
- POST /slots - Add availability slot
- DELETE /slots/:slotId - Remove availability slot
- GET /appointments - Fetch counselor appointments

**Appointment Routes (/api/appointments)**
- POST /book - Create appointment & Razorpay order
- POST /verify-payment - Confirm Razorpay signature
- PUT /:id/status - Update appointment status / Cancel appointment (triggers automated Razorpay refund)

## Security Notes
- Passwords hashed with bcryptjs, all protected routes require a JWT.
- Session notes and chat history are only accessible to the client + counselor on that exact appointment  enforced server-side.
- Razorpay payments are signature-verified server-side before anything is marked paid.
