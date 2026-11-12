class ApiResponse {
  constructor({ statusCode = 200, message = 'Request completed successfully', data = null }) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
