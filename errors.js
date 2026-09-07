class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class AuthenticationError extends AppError {
  constructor(message = "Invalid username or password") {
    super(message, 401);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

module.exports = { AppError, AuthenticationError, ConflictError, NotFoundError };
