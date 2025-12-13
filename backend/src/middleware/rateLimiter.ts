// import rateLimit from 'express-rate-limit';

// // Rate limiting middleware for login attempts
// export const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 login attempts per window
//   message: {
//     success: false,
//     message: 'Too many login attempts from this IP, please try again after 15 minutes'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // General API rate limiter
// export const apiLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 60, // limit each IP to 60 requests per minute
//   message: {
//     success: false,
//     message: 'Too many requests from this IP, please try again after a minute'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// No-op loginLimiter (does nothing)
//export const loginLimiter = (req, res, next) => next();
// Keep apiLimiter as is if you want to keep general rate limiting, or disable similarly if needed. 