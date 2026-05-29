// Centralized error handler to avoid leaking implementation details
const errorHandler = (err, req, res, _next) => {
  console.error(err);

  const status = err.statusCode || 500;
  const message =
    status >= 500
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Request failed';

  res.status(status).json({ message });
};

export default errorHandler;


