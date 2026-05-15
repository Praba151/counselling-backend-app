const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });
    socket.on('send_message', (data) => {
      io.to(data.roomId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = { initSocket };