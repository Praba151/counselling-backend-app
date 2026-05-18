const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const sessionNotesRoutes = require('./routes/sessionNotesRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});
initSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/session-notes', sessionNotesRoutes);
app.use('/api/payment', paymentRoutes);
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`Server running on port 5000 `);
    });
  })
  .catch((err) => console.log('MongoDB Error ', err));