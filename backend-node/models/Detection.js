const mongoose = require('mongoose');

const DetectionSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  event: {
    type: String,
    required: true
  },
  bird_count: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    default: 0.0
  },
  status: {
    type: String,
    required: true
  },
  inference_time_ms: {
    type: Number,
    default: 0
  },
  rawImage: {
    type: String, // Base64 Data URI (e.g. data:image/jpeg;base64,...)
    default: null
  },
  processedImage: {
    type: String, // Base64 Data URI
    default: null
  },
  detectedImage: {
    type: String, // Base64 Data URI
    default: null
  }
});

module.exports = mongoose.model('Detection', DetectionSchema);
