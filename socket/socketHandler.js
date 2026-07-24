const Message = require('../models/Message');

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
    
      io.to(data.roomId).emit('receive_message', data);

      
      try {
        await Message.create({
          appointmentId: data.roomId,
          senderId: data.senderId,
          senderName: data.sender,
          text: data.text
        });
      } catch (err) {
        console.log('Failed to save chat message:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = { initSocket };