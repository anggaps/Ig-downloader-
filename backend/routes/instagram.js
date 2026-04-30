const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory download history
const downloadHistory = [];

/**
 * POST /api/instagram/download
 * Download video from Instagram URL
 */
router.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('Download request:', url);
    
    // Validate URL
    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid Instagram URL' 
      });
    }

    // Extract shortcode
    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not extract shortcode from URL' 
      });
    }
    
    console.log('Shortcode:', shortcode);

    // Call RapidAPI
    let videoData = null;
    
    try {
      videoData = await fetchFromRapidAPI(url);
      console.log('RapidAPI success');
    } catch (error) {
      console.error('RapidAPI failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch video from Instagram. Please try again later.'
      });
    }

    if (!videoData || !videoData.videoUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'No video found in this post' 
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

// Helper functions
function extractShortcode(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchFromRapidAPI(url) {
  const options = {
    method: 'POST',
    url: 'https://instagram120.p.rapidapi.com/api/instagram/posts',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'instagram120.p.rapidapi.com',
      'x-rapidapi-key': 'dc3bcd60c0mshbe8a2e179bedd3dp1a0b4bjsnd6e54d810694'
    },
    data: {
      username: 'instagram',
      maxId: ''
    },
    timeout: 15000
  };

  try {
    const response = await axios.request(options);
    console.log('API Response type:', typeof response.data);
    
    // Handle different response formats
    let posts = response.data;
    if (typeof posts === 'object' && !Array.isArray(posts)) {
      // API might return { data: [...] } or { posts: [...] }
      posts = posts.data || posts.posts || posts.results || [];
    }
    
    if (!Array.isArray(posts)) {
      console.error('Unexpected response format:', JSON.stringify(response.data).substring(0, 200));
      throw new Error('Invalid API response format');
    }
    
    // Find post matching our URL/shortcode
    const targetShortcode = extractShortcode(url);
    const post = posts.find(p => {
      const postShortcode = p.shortcode || p.code || extractShortcode(p.url || p.link || '');
      return postShortcode === targetShortcode;
    });
    
    if (!post) {
      console.log('Post not found in response, using first available post');
      // If we can't find specific post, try to use first post with video
      const firstVideoPost = posts.find(p => extractVideoUrl(p));
      if (firstVideoPost) {
        return {
          videoUrl: extractVideoUrl(firstVideoPost),
          thumbnail: firstVideoPost.thumbnail_url || firstVideoPost.display_url || firstVideoPost.image_url || '',
          title: firstVideoPost.caption || firstVideoPost.title || 'Instagram Video',
          author: firstVideoPost.owner?.username || firstVideoPost.username || 'Unknown'
        };
      }
    }
    
    if (!post) {
      throw new Error('No video posts found');
    }
    
    return {
      videoUrl: extractVideoUrl(post),
      thumbnail: post.thumbnail_url || post.display_url || post.image_url || '',
      title: post.caption || post.title || `Instagram Video ${targetShortcode}`,
      author: post.owner?.username || post.username || 'Unknown'
    };
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

function extractVideoUrl(post) {
  if (!post) return null;
  
  if (post.video_url) return post.video_url;
  if (post.video_versions && post.video_versions[0]) return post.video_versions[0].url;
  if (post.media_url) return post.media_url;
  if (post.display_url) return post.display_url;
  if (post.thumbnail_url) return post.thumbnail_url;
  
  return null;
}

module.exports = router;
