const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory download history
const downloadHistory = [];

// RapidAPI Configuration - Instagram Reels Downloader API
const RAPIDAPI_HOST = 'instagram-reels-downloader-api.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'dc3bcd60c0mshbe8a2e179bedd3dp1a0b4bjsnd6e54d810694';

/**
 * POST /api/instagram/download
 * Download video from Instagram URL
 */
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('Download request:', url);
    
    // Validate URL
    if (!url || !isValidInstagramUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid Instagram URL (post, reel, or IGTV)' 
      });
    }

    // Call RapidAPI - Instagram Reels Downloader API
    let videoData = null;
    
    try {
      videoData = await fetchFromRapidAPI(url);
      console.log('RapidAPI success:', videoData);
    } catch (error) {
      console.error('RapidAPI failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch video. API limit reached or URL is invalid/private.'
      });
    }

    if (!videoData || !videoData.videoUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not find video. The post might be private, deleted, or not a video post.' 
      });
    }

    // Add to history
    const downloadItem = {
      id: Date.now(),
      url: url,
      thumbnail: videoData.thumbnail,
      title: videoData.title,
      quality: 'HD',
      author: videoData.author,
      downloadedAt: new Date().toISOString()
    };
    
    downloadHistory.unshift(downloadItem);
    if (downloadHistory.length > 50) downloadHistory.pop();

    res.json({
      success: true,
      data: {
        downloadUrl: videoData.videoUrl,
        thumbnail: videoData.thumbnail,
        title: videoData.title,
        quality: 'HD',
        author: videoData.author,
        format: 'mp4'
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

/**
 * GET /api/instagram/history
 */
router.get('/history', (req, res) => {
  res.json({ 
    success: true, 
    data: downloadHistory 
  });
});

/**
 * DELETE /api/instagram/history/:id
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

async function fetchFromRapidAPI(url) {
  const options = {
    method: 'GET',
    url: `https://${RAPIDAPI_HOST}/download`,
    params: {
      url: url
    },
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY
    },
    timeout: 15000
  };

  try {
    const response = await axios.request(options);
    console.log('API Response:', JSON.stringify(response.data).substring(0, 500));
    
    const data = response.data;
    
    // Handle different response formats
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Extract video URL from various possible response formats
    const videoUrl = data.video_url || data.videoUrl || data.url || data.media_url || data.download_url;
    const thumbnail = data.thumbnail_url || data.thumbnail || data.image_url || data.cover || '';
    const title = data.caption || data.title || data.description || 'Instagram Video';
    const author = data.username || data.author || data.user || 'Instagram User';
    
    if (!videoUrl) {
      console.error('Response data:', JSON.stringify(data));
      throw new Error('No video URL found in API response');
    }
    
    return {
      videoUrl: videoUrl,
      thumbnail: thumbnail,
      title: title.substring(0, 100),
      author: author
    };
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = router;
