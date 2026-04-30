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
    
    // Validate URL
    if (!url || !isValidInstagramUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid Instagram URL (post, reel, or IGTV)' 
      });
    }

    // Extract username and shortcode from URL
    const urlInfo = extractUrlInfo(url);
    if (!urlInfo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not extract information from URL' 
      });
    }

    // Fetch posts from RapidAPI
    const posts = await fetchInstagramPosts(urlInfo.username);
    
    // Find matching post
    const targetPost = findPostByUrl(posts, url);
    
    if (!targetPost) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found. It might be private or unavailable.' 
      });
    }

    // Extract video URL
    const videoUrl = extractVideoUrl(targetPost);
    const thumbnail = targetPost.thumbnail_url || targetPost.display_url;
    const caption = targetPost.caption || targetPost.edge_media_to_caption?.edges[0]?.node?.text || 'Instagram Video';
    const author = targetPost.owner?.username || urlInfo.username;

    if (!videoUrl) {
      return res.status(404).json({
        success: false,
        error: 'No video found in this post'
      });
    }

    // Add to history
    const downloadItem = {
      id: Date.now(),
      url: url,
      thumbnail: thumbnail,
      title: caption.substring(0, 100),
      quality: 'HD',
      author: author,
      downloadedAt: new Date().toISOString()
    };
    
    downloadHistory.unshift(downloadItem);
    if (downloadHistory.length > 50) downloadHistory.pop();

    res.json({
      success: true,
      data: {
        downloadUrl: videoUrl,
        thumbnail: thumbnail,
        title: caption.substring(0, 100),
        quality: 'HD',
        author: author,
        format: 'mp4'
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

function extractUrlInfo(url) {
  // Extract shortcode from URL
  const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  if (!shortcodeMatch) return null;
  
  // Try to extract username from URL (if present in post URL)
  const usernameMatch = url.match(/instagram\.com\/([^\/]+)\//);
  
  return {
    shortcode: shortcodeMatch[1],
    username: usernameMatch ? usernameMatch[1] : null
  };
}

async function fetchInstagramPosts(username) {
  const options = {
    method: 'POST',
    url: `https://${RAPIDAPI_HOST}/api/instagram/posts`,
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY
    },
    data: {
      username: username || 'keke',
      maxId: ''
    },
    timeout: 15000
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('RapidAPI error:', error.message);
    throw new Error('Failed to fetch from Instagram API');
  }
}

function findPostByUrl(posts, targetUrl) {
  if (!posts || !Array.isArray(posts)) return null;
  
  const shortcode = extractShortcode(targetUrl);
  return posts.find(post => {
    const postShortcode = post.shortcode || extractShortcode(post.url || '');
    return postShortcode === shortcode;
  });
}

function extractShortcode(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractVideoUrl(post) {
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
