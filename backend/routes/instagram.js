const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// In-memory download history
const downloadHistory = [];

// Instagram oEmbed API endpoint
const INSTAGRAM_OEMBED = 'https://api.instagram.com/oembed';

// RapidAPI Instagram Downloader (free tier available)
const RAPIDAPI_HOST = 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com';

/**
 * POST /api/instagram/download
 * Download video from Instagram URL
 */
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate URL
    if (!url || !isValidInstagramUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid Instagram URL (post, reel, or IGTV)' 
      });
    }

    // Extract shortcode
    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not extract post ID from URL' 
      });
    }

    // Fetch video info using multiple methods
    const videoInfo = await fetchVideoInfo(url, shortcode);
    
    if (!videoInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not fetch video. The post might be private or unavailable.' 
      });
    }

    // Add to history
    const downloadItem = {
      id: Date.now(),
      url: url,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title || `Instagram Video ${shortcode}`,
      quality: videoInfo.quality || 'HD',
      author: videoInfo.author || 'Unknown',
      downloadedAt: new Date().toISOString()
    };
    
    downloadHistory.unshift(downloadItem);
    if (downloadHistory.length > 50) downloadHistory.pop();

    res.json({
      success: true,
      data: {
        downloadUrl: videoInfo.videoUrl,
        thumbnail: videoInfo.thumbnail,
        title: videoInfo.title,
        quality: videoInfo.quality,
        author: videoInfo.author,
        duration: videoInfo.duration
      }
    });

  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process video. Please try again later.' 
    });
  }
});

/**
 * GET /api/instagram/history
 * Get download history
 */
router.get('/history', (req, res) => {
  res.json({ 
    success: true, 
    data: downloadHistory 
  });
});

/**
 * DELETE /api/instagram/history/:id
 * Remove item from history
 */
router.delete('/history/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = downloadHistory.findIndex(item => item.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }
  
  downloadHistory.splice(index, 1);
  res.json({ success: true });
});

// Helper functions
function isValidInstagramUrl(url) {
  const regex = /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[^\/]+/i;
  return regex.test(url);
}

function extractShortcode(url) {
  const regex = /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function fetchVideoInfo(url, shortcode) {
  try {
    // Method 1: Try oEmbed API
    const oembedData = await fetchOEmbed(url);
    if (oembedData) {
      return {
        videoUrl: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
        thumbnail: oembedData.thumbnail_url,
        title: oembedData.title || oembedData.author_name,
        author: oembedData.author_name,
        quality: 'HD'
      };
    }
  } catch (err) {
    console.log('oEmbed failed, trying fallback...');
  }

  // Method 2: Return mock data for demo (replace with actual scraping/API)
  return {
    videoUrl: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
    thumbnail: `https://via.placeholder.com/400x400/333/fff?text=Instagram+Video`,
    title: `Instagram Video ${shortcode}`,
    author: 'Unknown',
    quality: 'HD',
    duration: '0:30'
  };
}

async function fetchOEmbed(url) {
  try {
    const response = await axios.get(INSTAGRAM_OEMBED, {
      params: { url },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('oEmbed error:', error.message);
    return null;
  }
}

module.exports = router;
