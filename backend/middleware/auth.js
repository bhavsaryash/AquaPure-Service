import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth Middleware - Header:', authHeader); // DEBUG LOG
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    console.log('Auth Middleware - No Token Found'); // DEBUG LOG
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('Auth Middleware - Verify Failed:', err.message); // DEBUG LOG
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log('Admin Middleware - Access Denied for role:', req.user?.role); // DEBUG LOG
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

export default protect;


