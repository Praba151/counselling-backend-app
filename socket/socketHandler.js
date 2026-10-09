const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const initSocket = (io) => {
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name');
      if (!user) return next(new Error('Unauthorized'));
      socket.user = { id: decoded.id.toString(), name: user.name };
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    
    socket.on('join_room', async (roomId) => {
      try {
        const appointment = await Appointment.findById(roomId);
        const isMember =
          appointment &&
          (appointment.clientId.toString() === socket.user.id ||
            appointment.counselorId.toString() === socket.user.id);
        if (!isMember) return socket.emit('chat_error', 'You are not allowed in this chat');
        socket.join(roomId);
      } catch (err) {
        socket.emit('chat_error', 'Could not join the chat');
      }
    });

    
    socket.on('send_message', async (data) => {
      try {
        const roomId = data?.roomId;
        const text = typeof data?.text === 'string' ? data.text.trim() : '';
        if (!text || text.length > 2000) return;
        if (!roomId || !socket.rooms.has(roomId)) return; // must have joined this room first

        const saved = await Message.create({
          appointmentId: roomId,
          senderId: socket.user.id,
          senderName: socket.user.name,
          text,
        });

        io.to(roomId).emit('receive_message', {
          roomId,
          sender: saved.senderName,
          senderId: saved.senderId.toString(),
          text: saved.text,
          createdAt: saved.createdAt,
        });
      } catch (err) {
        console.log('Failed to save chat message:', err.message);
      }
    });
  });
};

module.exports = { initSocket };