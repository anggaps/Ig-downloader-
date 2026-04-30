const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory download history
const downloadHistory = [];

// RapidAPI Configuration
const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'dc3bcd60c0mshbe8a2e179bedd3dp1a0b4bjsnd6e54d810694';

/**
 * POST /api/instagram/download
 * Download video from Instagram URL using RapidAPI
 */
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('Download request received:', url);
    
    // Validate URL
    if (!url || !isValidInstagramUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid Instagram URL (post, reel, or IGTV)' 
      });
    }

    // Extract shortcode from URL
    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not extract shortcode from URL' 
      });
    }
    
    console.log('Extracted shortcode:', shortcode);

    // Try RapidAPI first
    let videoData = null;
    
    try {
      videoData = await fetchFromRapidAPI(shortcode);
      console.log('RapidAPI success:', videoData);
    } catch (rapidError) {
      console.error('RapidAPI failed:', rapidError.message);
      // Fallback: try direct URL construction
      videoData = await generateFallbackData(shortcode, url);
    }

    if (!videoData || !videoData.videoUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not find video for this post. It might be private, deleted, or not a video post.' 
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
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchFromRapidAPI(shortcode) {
  const options = {
    method: 'POST',
    url: `https://${RAPIDAPI_HOST}/api/instagram/posts`,
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY
    },
    data: {
      username: 'instagram',
      maxId: ''
    },
    timeout: 15000
  };

  try {
    const response = await axios.request(options);
    console.log('RapidAPI response:', JSON.stringify(response.data).substring(0, 500));
    
    const posts = response.data;
    if (!Array.isArray(posts)) {
      throw new Error('Invalid response format');
    }
    
    const post = posts.find(p => {
      const postShortcode = p.shortcode || p.code || extractShortcode(p.url || '');
      return postShortcode === shortcode;
    });
    
    if (!post) {
      throw new Error('Post not found in API response');
    }
    
    return {
      videoUrl: extractVideoUrl(post),
      thumbnail: post.thumbnail_url || post.display_url || post.image_url,
      title: post.caption || post.title || `Instagram Video ${shortcode}`,
      author: post.owner?.username || post.username || 'Unknown'
    };
  } catch (error) {
    console.error('RapidAPI error:', error.message);
    throw error;
  }
}

async function generateFallbackData(shortcode, url) {
  // Fallback using ddinstagram.com (public Instagram mirror)
  return {
    videoUrl: `https://ddinstagram.com/p/${shortcode}/video.mp4`,
    thumbnail: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
    title: `Instagram Video ${shortcode}`,
    author: 'Instagram User'
  };
}

function extractVideoUrl(post) {
  if (!post) return null;
  
  // Try multiple possible locations for video URL
  if (post.video_url) return post.video_url;
  if (post.video_versions && post.video_versions[0]) return post.video_versions[0].url;
  if (post.media_url) return post.media_url;
  if (post.display_url) return post.display_url;
  
  // Check carousel media
  if (post.carousel_media && post.carousel_media[0]) {
    const media = post.carousel_media[0];
    if (media.video_url) return media.video_url;
    if (media.video_versions && media.video_versions[0]) return media.video_versions[0].url;
  }
  
  return null;
}

module.exports = router;
