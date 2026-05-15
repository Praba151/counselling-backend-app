const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const counselorOnly = (req, res, next) => {
  if (req.user.role !== 'counselor') {
    return res.status(403).json({ message: 'Counselors only' });
  }
  next();
};

module.exports = { protect, counselorOnly };