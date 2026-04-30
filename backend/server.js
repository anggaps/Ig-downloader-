const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/instagram/download', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid Instagram URL' 
      });
    }

    const shortcode = extractShortcode(url);
    if (!shortcode) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract shortcode'
      });
    }

    // Return mock data for now (API integration can be added later)
    res.json({
      success: true,
      data: {
        downloadUrl: `https://ddinstagram.com/p/${shortcode}/video.mp4`,
        thumbnail: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
        title: `Instagram Video ${shortcode}`,
        quality: 'HD',
        author: 'Instagram User'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve inline HTML frontend
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getHTML());
});

function getHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Instagram Downloader</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{background:#fff;border-radius:20px;padding:40px;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}
h1{text-align:center;color:#333;margin-bottom:10px}
.subtitle{text-align:center;color:#666;margin-bottom:30px}
.input-group{display:flex;gap:10px;margin-bottom:20px}
input{flex:1;padding:15px;border:2px solid #ddd;border-radius:10px;font-size:1rem;outline:none}
input:focus{border-color:#667eea}
button{padding:15px 25px;background:#667eea;color:#fff;border:none;border-radius:10px;font-size:1rem;cursor:pointer}
button:hover{opacity:.9}
button:disabled{opacity:.5}
.loading,.result,.error{text-align:center;margin-top:20px;display:none}
.loading.active,.result.active,.error.active{display:block}
.spinner{width:40px;height:40px;border:4px solid #ddd;border-top-color:#667eea;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 10px}
@keyframes spin{to{transform:rotate(360deg)}}
.thumbnail{max-width:100%;border-radius:10px;margin-bottom:15px}
.download-btn{display:inline-block;padding:12px 30px;background:#28a745;color:#fff;text-decoration:none;border-radius:8px;margin-top:10px}
.error{color:#dc3545}
</style>
</head>
<body>
<div class="container">
<h1>📷 Instagram Downloader</h1>
<p class="subtitle">Download videos without watermark</p>
<div class="input-group">
<input type="text" id="url" placeholder="Paste Instagram URL...">
<button id="btn" onclick="download()">Download</button>
</div>
<div class="loading" id="loading"><div class="spinner"></div><p>Processing...</p></div>
<div class="result" id="result">
<img id="thumb" class="thumbnail" src="" alt="">
<h3 id="title"></h3>
<a id="link" href="#" class="download-btn" target="_blank">⬇️ Download</a>
</div>
<div class="error" id="error"></div>
</div>
<script>
async function download(){
const url=document.getElementById('url').value.trim();
const btn=document.getElementById('btn');
if(!url.includes('instagram.com')){showError('Please enter valid Instagram URL');return;}
document.getElementById('loading').classList.add('active');
document.getElementById('result').classList.remove('active');
document.getElementById('error').classList.remove('active');
btn.disabled=true;btn.textContent='Processing...';
try{
const res=await fetch('/api/instagram/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
const data=await res.json();
if(!data.success)throw new Error(data.error);
document.getElementById('thumb').src=data.data.thumbnail;
document.getElementById('title').textContent=data.data.title;
document.getElementById('link').href=data.data.downloadUrl;
document.getElementById('result').classList.add('active');
}catch(err){showError(err.message)}
finally{document.getElementById('loading').classList.remove('active');btn.disabled=false;btn.textContent='Download';}
}
function showError(msg){document.getElementById('error').textContent=msg;document.getElementById('error').classList.add('active');}
document.getElementById('url').addEventListener('keypress',e=>{if(e.key==='Enter')download()});
</script>
</body>
</html>`;
}

function extractShortcode(url) {
  const match = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// For local development
if (!process.env.VERCEL) {
  app.listen(3000, () => console.log('Server running'));
}

module.exports = app;
