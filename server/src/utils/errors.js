/** An error that is safe to show to the API client. */
class AppError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields; // optional { fieldName: message } map for form errors
  }
}

/** 400 error built from a { field: message } map; the first message becomes the summary. */
function validationError(fields) {
  return new AppError(400, Object.values(fields)[0], fields);
}

module.exports = { AppError, validationError };
