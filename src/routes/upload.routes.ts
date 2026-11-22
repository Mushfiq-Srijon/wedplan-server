import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
});

router.post('/image', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!env.imgbbApiKey) {
      res.status(503).json({ message: 'Image hosting is not configured.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: 'Choose an image to upload.' });
      return;
    }

    const form = new FormData();
    // ImgBB accepts base64 data, which avoids writing user uploads to disk.
    form.append('image', req.file.buffer.toString('base64'));
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${env.imgbbApiKey}`, {
      method: 'POST',
      body: form,
    });
    const data = (await response.json()) as {
      success?: boolean;
      data?: { display_url?: string; url?: string };
    };

    if (!response.ok || !data.success || !data.data?.display_url) {
      res.status(502).json({ message: 'ImgBB could not host this image.' });
      return;
    }
    res.json({ url: data.data.display_url || data.data.url });
  } catch (error) {
    next(error);
  }
});

export default router;
