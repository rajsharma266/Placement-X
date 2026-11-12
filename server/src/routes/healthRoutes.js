const express = require('express');
const ApiResponse = require('../utils/ApiResponse');

const router = express.Router();

router.get('/', (req, res) => {
  const response = new ApiResponse({
    message: 'PlacementX API is running',
    data: {
      environment: process.env.NODE_ENV || 'development',
    },
  });

  res.status(response.statusCode).json({
    success: response.success,
    message: response.message,
    data: response.data,
  });
});

module.exports = router;
