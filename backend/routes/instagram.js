const express = require('express');
const axios = require('axios');
const router = express.Router();

// Download history
const downloadHistory = [];

// Get video info from Instagram URL
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({ error: 'Invalid Instagram URL' });
    }

    // Extract shortcode from URL
    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return res.status(400).json({ error: 'Could not extract post ID from URL' });
    }

    // Get video info (this is a simplified version)
    const videoInfo = await getVideoInfo(shortcode);
    
    // Add to history
    const downloadItem = {
      id: Date.now(),
      url: url,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title || 'Instagram Video',
      quality: videoInfo.quality || 'HD',
      downloadedAt: new Date().toISOString()
    };
    downloadHistory.unshift(downloadItem);
    
    // Keep only last 50 items
    if (downloadHistory.length > 50) {
      downloadHistory.pop();
    }

    res.json({
      success: true,
      data: {
        downloadUrl: videoInfo.downloadUrl,
        thumbnail: videoInfo.thumbnail,
        title: videoInfo.title,
        quality: videoInfo.quality
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Get download history
router.get('/history', (req, res) => {
  res.json({ success: true, data: downloadHistory });
});

// Extract shortcode from Instagram URL
function extractShortcode(url) {
  const regex = /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Get video info (placeholder implementation)
async function getVideoInfo(shortcode) {
  // In production, this would use Instagram's API or scraping
  // For demo purposes, returning mock data
  return {
    downloadUrl: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
    thumbnail: `https://www.instagram.com/p/${shortcode}/media/?size=m`,
    title: `Instagram Video ${shortcode}`,
    quality: 'HD'
  };
}

module.exports = router;
