const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  esp32_ip: {
    type: String,
    default: '192.168.1.100'
  },
  trigger_confidence: {
    type: Number,
    default: 0.45
  },
  yolo_conf_threshold: {
    type: Number,
    default: 0.25
  },
  cleanup_age_days: {
    type: Number,
    default: 7
  }
}, { timestamps: true });

// Always keep a single settings document in the database
module.exports = mongoose.model('Settings', SettingsSchema);
