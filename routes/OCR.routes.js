const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

const router = express.Router();

// Configure multer for handling image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Enhanced OCR endpoint with Tesseract
router.post("/detect-letters", upload.single("image"), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const imagePath = req.file.path;

    // Image preprocessing with Sharp
    let processedImagePath = imagePath;
    if (
      req.body.enhanceContrast === "true" ||
      req.body.sharpen === "true" ||
      req.body.denoise === "true" ||
      req.body.grayScale === "true"
    ) {
      processedImagePath = await preprocessImage(imagePath, req.body);
    }

    // Process with Enhanced Tesseract
    const result = await processWithEnhancedTesseract(processedImagePath);

    const processingTime = Date.now() - startTime;

    // Clean up files
    [imagePath, processedImagePath].forEach((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
    });

    res.json({
      success: true,
      engine: "tesseract",
      text: result.text || "",
      confidence: result.confidence || 0,
      processingTime: processingTime,
    });
  } catch (error) {
    console.error("OCR Error:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Enhanced image preprocessing function
async function preprocessImage(inputPath, options) {
  const outputPath = inputPath.replace(/\.[^/.]+$/, "-processed.jpg");

  try {
    let pipeline = sharp(inputPath);

    // Convert to grayscale first for better OCR
    pipeline = pipeline.greyscale();

    // Enhance contrast more aggressively
    if (options.enhanceContrast === "true") {
      pipeline = pipeline.normalize().modulate({
        brightness: 1.1,
        saturation: 0,
        hue: 0,
      });
    }

    // More aggressive sharpening for license plates
    if (options.sharpen === "true") {
      pipeline = pipeline.sharpen({
        sigma: 1.0,
        flat: 1.0,
        jagged: 2.0,
      });
    }

    // Better denoising
    if (options.denoise === "true") {
      pipeline = pipeline.median(2);
    }

    // Higher resolution for better character recognition
    pipeline = pipeline.resize(null, 1500, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });

    // Apply additional contrast enhancement
    pipeline = pipeline.linear(1.2, -(128 * 0.2));

    await pipeline
      .jpeg({
        quality: 95,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Image preprocessing error:", error);
    return inputPath; // Return original if preprocessing fails
  }
}

// Enhanced Tesseract processing with better settings for license plates
async function processWithEnhancedTesseract(imagePath) {
  try {
    const {
      data: { text, confidence },
    } = await Tesseract.recognize(imagePath, "eng", {
      logger: (m) => console.log(m),
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -.",
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      preserve_interword_spaces: "1",
      tessedit_char_blacklist: "!@#$%^&*()_+=[]{}|;':\",./<>?~`",
    });

    return {
      text: text.trim(),
      confidence: Math.round(confidence),
    };
  } catch (error) {
    throw new Error(`Enhanced Tesseract error: ${error.message}`);
  }
}

// Google Cloud Vision API
async function processWithGoogleVision(imagePath, apiKey) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }
    );

    const annotations = response.data.responses[0]?.textAnnotations;
    if (annotations && annotations.length > 0) {
      return {
        text: annotations[0].description || "",
        confidence: 95, // Vision API doesn't return a single confidence; use heuristic/high default
      };
    }
    return { text: "", confidence: 0 };
  } catch (error) {
    throw new Error(
      `Google Vision API error: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
}

// Azure Computer Vision OCR (v3.2)
async function processWithAzureVision(imagePath, subscriptionKey, endpoint) {
  const imageBuffer = fs.readFileSync(imagePath);

  try {
    const response = await axios.post(
      `${endpoint.replace(/\/+$/, "")}/vision/v3.2/ocr`,
      imageBuffer,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": subscriptionKey,
          "Content-Type": "application/octet-stream",
        },
        params: { language: "unk", detectOrientation: true },
      }
    );

    let text = "";
    let totalConfidence = 0;
    let wordCount = 0;

    response.data.regions?.forEach((region) => {
      region.lines?.forEach((line) => {
        line.words?.forEach((word) => {
          text += word.text + " ";
          totalConfidence += parseFloat(word.confidence || 0.9);
          wordCount++;
        });
        text += "\n";
      });
    });

    const avgConfidence =
      wordCount > 0 ? Math.round((totalConfidence / wordCount) * 100) : 0;

    return { text: text.trim(), confidence: avgConfidence };
  } catch (error) {
    throw new Error(
      `Azure Vision API error: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

// Enhanced multi-engine OCR endpoint (Tesseract/Google/Azure)
router.post(
  "/detect-letters-enhanced",
  upload.single("image"),
  async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No image file provided" });
      }

      const imagePath = req.file.path;

      let processedImagePath = imagePath;
      if (
        req.body.enhanceContrast === "true" ||
        req.body.sharpen === "true" ||
        req.body.denoise === "true" ||
        req.body.grayScale === "true"
      ) {
        processedImagePath = await preprocessImage(imagePath, req.body);
      }

      const result = await processWithEnhancedTesseract(processedImagePath);
      const processingTime = Date.now() - startTime;

      [imagePath, processedImagePath].forEach((p) => {
        if (p && fs.existsSync(p)) {
          fs.unlink(
            p,
            (err) => err && console.error("Error deleting file:", err)
          );
        }
      });

      const text = result.text || "";
      const letters = text.replace(/[^A-Za-z0-9\s-]/g, "").trim();
      const words = text
        ? text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
        : [];

      res.json({
        success: true,
        text,
        letters,
        words,
        confidence: result.confidence || 0,
        processingTime,
      });
    } catch (error) {
      console.error("Enhanced OCR Error:", error);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlink(
          req.file.path,
          (err) => err && console.error("Error deleting file:", err)
        );
      }

      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
