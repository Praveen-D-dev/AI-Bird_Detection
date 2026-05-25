const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const Detection = require('./models/Detection');
const Settings = require('./models/Settings');

// Helper to normalize the internal Python microservice URL
const getPythonBackendUrl = () => {
  let url = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  // Append standard port 5001 if it's the Render internal service name without port
  if (url.includes('bird-deterrent-python-ai') && !url.includes(':5001')) {
    url = `${url}:5001`;
  }
  return url;
};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (use high limits for base64 payload handling)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer in-memory storage for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log(`[${new Date().toISOString()}] [MongoDB] Connected successfully to Atlas Cluster`);
    // Initialize default settings if not present
    const count = await Settings.countDocuments();
    if (count === 0) {
      await Settings.create({});
      console.log(`[${new Date().toISOString()}] [MongoDB] Default system configurations initialized`);
    }
  })
  .catch(err => {
    console.error(`[${new Date().toISOString()}] [MongoDB] Connection error:`, err);
  });

// --- API ROUTES ---

// 1. Settings GET & POST
app.get('/settings', async (req, res) => {
  try {
    const config = await Settings.findOne();
    res.json(config);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/settings', async (req, res) => {
  try {
    const { esp32_ip, trigger_confidence, yolo_conf_threshold, cleanup_age_days } = req.body;
    let config = await Settings.findOne();
    if (!config) {
      config = new Settings();
    }
    
    if (esp32_ip !== undefined) config.esp32_ip = esp32_ip;
    if (trigger_confidence !== undefined) config.trigger_confidence = Number(trigger_confidence);
    if (yolo_conf_threshold !== undefined) config.yolo_conf_threshold = Number(yolo_conf_threshold);
    if (cleanup_age_days !== undefined) config.cleanup_age_days = Number(cleanup_age_days);
    
    await config.save();
    
    // Synchronize settings with Python AI microservice in background
    const pythonUrl = getPythonBackendUrl();
    axios.post(`${pythonUrl}/sync-settings`, {
      esp32_ip: config.esp32_ip,
      trigger_confidence: config.trigger_confidence,
      yolo_conf_threshold: config.yolo_conf_threshold
    }, { timeout: 2000 }).catch(() => {
      console.log(`[${new Date().toISOString()}] [Settings] Skipping Python sync (microservice offline at ${pythonUrl})`);
    });

    res.json({ status: 'success', config });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// 2. Detection (ESP32-CAM upload / Manual Testing)
app.post('/detect', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Fetch active parameters to pass to YOLO pipeline
    const config = await Settings.findOne() || { yolo_conf_threshold: 0.25, trigger_confidence: 0.45 };

    // Prepare FormData to forward to the Python AI service
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'capture.jpg',
      contentType: req.file.mimetype
    });
    form.append('yolo_conf_threshold', config.yolo_conf_threshold.toString());
    form.append('trigger_confidence', config.trigger_confidence.toString());
    form.append('esp32_ip', config.esp32_ip);

    // Call Python YOLO microservice
    const pythonUrl = getPythonBackendUrl();
    console.log(`[${new Date().toISOString()}] [AI Pipeline] Forwarding image frame to YOLO microservice at ${pythonUrl}/detect_process...`);
    const pythonResponse = await axios.post(
      `${pythonUrl}/detect_process`,
      form,
      {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const result = pythonResponse.data;

    // Save detection event to MongoDB Atlas
    const newDetection = new Detection({
      event: result.event,
      bird_count: result.bird_count,
      confidence: result.confidence,
      status: result.status,
      inference_time_ms: result.inference_time_ms,
      rawImage: result.raw_base64,
      processedImage: result.processed_base64,
      detectedImage: result.detected_base64
    });

    await newDetection.save();
    console.log(`[${new Date().toISOString()}] [AI Pipeline] Event saved to MongoDB. Status: ${result.status} | Inference: ${result.inference_time_ms}ms`);

    // Asynchronously clean up expired records to maximize response speed
    const cleanupLimitDays = config.cleanup_age_days || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupLimitDays);
    Detection.deleteMany({ timestamp: { $lt: cutoffDate } })
      .catch(err => console.error(`[${new Date().toISOString()}] [DB Cleanup] Error:`, err.message));

    // Respond back immediately to release client (ESP32/React)
    res.json({
      event: result.event,
      bird_count: result.bird_count,
      confidence: result.confidence,
      status: result.status,
      inference_time_ms: result.inference_time_ms
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [AI Pipeline] Pipeline error:`, error.message);
    res.status(500).json({ error: `AI pipeline error: ${error.message}` });
  }
});

// 3. Status Polling Endpoint
app.get('/status', async (req, res) => {
  try {
    const latest = await Detection.findOne().sort({ timestamp: -1 });
    
    // Fetch start of today in system local time (00:00:00.000)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Aggregate statistics for the current day
    const dailyStats = await Detection.aggregate([
      {
        $match: {
          timestamp: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalBirdCount: { $sum: '$bird_count' },
          avgConfidence: { $avg: { $cond: [{ $eq: ['$event', 'bird'] }, '$confidence', null] } }
        }
      }
    ]);

    const todayStats = dailyStats[0] || { totalBirdCount: 0, avgConfidence: 0.0 };

    // Fetch recent bird detections for history list
    const recentDetections = await Detection.find({ event: 'bird' })
      .sort({ timestamp: -1 })
      .limit(20);

    const history = recentDetections.map(d => ({
      time: d.timestamp.toLocaleTimeString('en-US', { hour12: false }),
      bird_count: d.bird_count,
      confidence: d.confidence
    }));

    if (!latest) {
      return res.json({
        event: 'none',
        bird_count: 0,
        confidence: 0.0,
        status: 'Safe',
        timestamp: Date.now() / 1000,
        inference_time_ms: 0,
        history: []
      });
    }

    res.json({
      event: latest.event,
      // Aggregated daily metrics that refresh every midnight
      bird_count: todayStats.totalBirdCount,
      confidence: todayStats.avgConfidence ? parseFloat(todayStats.avgConfidence.toFixed(2)) : 0.0,
      status: latest.status,
      timestamp: latest.timestamp.getTime() / 1000,
      inference_time_ms: latest.inference_time_ms,
      history
    });
  } catch (error) {
    console.error('Error retrieving status:', error);
    res.status(500).json({ error: 'Failed to retrieve status' });
  }
});

// 4. Images List Endpoint
app.get('/images-list', async (req, res) => {
  try {
    const latest = await Detection.findOne().sort({ timestamp: -1 });
    
    const hasRaw = latest && latest.rawImage;
    const hasProcessed = latest && latest.processedImage;
    const hasDetected = latest && latest.detectedImage;

    const t = Date.now();
    res.json({
      latest_upload: hasDetected ? `/uploads/latest_detected.jpg?t=${t}` : null,
      latest_raw: hasRaw ? `/uploads/latest_raw.jpg?t=${t}` : null,
      latest_processed: hasProcessed ? `/uploads/latest_processed.jpg?t=${t}` : null,
      latest_detected: hasDetected ? `/uploads/latest_detected.jpg?t=${t}` : null,
      recent_crops: [] // Handled in-memory on DB now
    });
  } catch (error) {
    console.error('Error fetching images list:', error);
    res.status(500).json({ error: 'Failed to retrieve images list' });
  }
});

// 5. Binary Image Server from MongoDB
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const latestDetection = await Detection.findOne({
      $or: [
        { rawImage: { $ne: null } },
        { processedImage: { $ne: null } },
        { detectedImage: { $ne: null } }
      ]
    }).sort({ timestamp: -1 });

    if (!latestDetection) {
      return res.status(404).send('No images found in database');
    }

    let base64String = null;
    if (filename.includes('raw')) {
      base64String = latestDetection.rawImage;
    } else if (filename.includes('processed')) {
      base64String = latestDetection.processedImage;
    } else if (filename.includes('detected')) {
      base64String = latestDetection.detectedImage;
    }

    if (!base64String) {
      return res.status(404).send('Image file not found for this type');
    }

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('Corrupted image encoding in database');
    }

    const contentType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.set('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving upload:', error);
    res.status(500).send('Internal server error serving image');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] [Express] MERN Server running on port ${PORT}`);
});
