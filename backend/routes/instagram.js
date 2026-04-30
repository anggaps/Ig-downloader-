const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory download history
const downloadHistory = [];

/**
 * POST /api/instagram/download
 * Download video from Instagram URL using RapidAPI
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

    // Try multiple methods to get video
    let videoInfo = null;
    
    // Method 1: Try Instagram oEmbed
    try {
      videoInfo = await fetchOEmbed(url);
    } catch (err) {
      console.log('oEmbed failed, trying next method...');
    }
    
    // Method 2: Use RapidAPI if key available
    if (!videoInfo && process.env.RAPIDAPI_KEY) {
      try {
        videoInfo = await fetchFromRapidAPI(url);
      } catch (err) {
        console.log('RapidAPI failed:', err.message);
      }
    }
    
    // Method 3: Generate direct link (fallback)
    if (!videoInfo) {
      videoInfo = await generateDirectLink(url, shortcode);
    }

    if (!videoInfo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not fetch video. The post might be private, deleted, or unavailable.' 
      });
    }

    // Add to history
    const downloadItem = {
      id: Date.now(),
      url: url,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title || `Instagram Video`,
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
        duration: videoInfo.duration,
        format: videoInfo.format || 'mp4'
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

async function fetchOEmbed(url) {
  try {
    const response = await axios.get('https://api.instagram.com/oembed', {
      params: { url },
      timeout: 5000
    });
    
    const data = response.data;
    return {
      videoUrl: data.thumbnail_url.replace('s640x640', 's1080x1080'),
      thumbnail: data.thumbnail_url,
      title: data.title || data.author_name,
      author: data.author_name,
      quality: 'HD'
    };
  } catch (error) {
    throw new Error('oEmbed failed: ' + error.message);
  }
}

async function fetchFromRapidAPI(url) {
  const options = {
    method: 'GET',
    url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/get-info-rapidapi',
    params: { url },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
    },
    timeout: 10000
  };

  const response = await axios.request(options);
  const data = response.data;
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return {
    videoUrl: data.video_url || data.media_url,
    thumbnail: data.thumbnail_url || data.cover,
    title: data.title || data.caption || 'Instagram Video',
    author: data.author || data.username || 'Unknown',
    quality: 'HD',
    duration: data.duration
  };
}

async function generateDirectLink(url, shortcode) {
  // Fallback: Try to construct direct media URL
  // Note: This method may not work for all posts due to Instagram's restrictions
  
  return {
    videoUrl: `https://ddinstagram.com/p/${shortcode}/video.mp4`,
    thumbnail: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
    title: `Instagram Video ${shortcode}`,
    author: 'Unknown',
    quality: 'HD',
    format: 'mp4'
  };
}

module.exports = router;
