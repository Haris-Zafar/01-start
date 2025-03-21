// middleware/loggingMiddleware.js
const requestLogger = (req, res, next) => {
  const start = new Date();

  res.on("finish", () => {
    const duration = new Date() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};

const errorLogger = (err, req, res, next) => {
  console.error(`${err.name}: ${err.message}`);
  console.error(err.stack);
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
