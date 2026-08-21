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


##  Booking Flows of the Backend

1. Client books → `POST /appointments/book` → checks the slot isn't already taken, sends booking-notification emails to both client and counselor (via Brevo)
2. Client pays → `POST /payment/create-order` → creates a Razorpay order, logs a `Payment` record
3. Razorpay confirms → `POST /payment/verify` → verifies the payment signature server-side, marks the appointment `confirmed` + `paid`, generates a Jitsi video link, sends a confirmation email (via Brevo)
4. Session happens → client + counselor use the Jitsi link, chat in real time , and can email each other outside the session
5. After the session → counselor writes session notes 

## Security Notes
- Passwords hashed with bcryptjs, all protected routes require a JWT.
- Session notes and chat history are only accessible to the client + counselor on that exact appointment  enforced server-side.
- Razorpay payments are signature-verified server-side before anything is marked paid.
