const express = require('express');
const cors = require('cors');
const instagramRoutes = require('./routes/instagram');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/instagram', instagramRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Serve inline HTML frontend
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Video Downloader</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2rem;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        input {
            flex: 1;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }
        input:focus {
            border-color: #667eea;
        }
        button {
            padding: 15px 30px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            display: none;
        }
        .result.active {
            display: block;
        }
        .thumbnail {
            width: 100%;
            max-width: 300px;
            border-radius: 10px;
            margin-bottom: 15px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        .download-btn {
            display: inline-block;
            padding: 12px 30px;
            background: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 10px;
            text-align: center;
        }
        .loading {
            text-align: center;
            display: none;
        }
        .loading.active {
            display: block;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #ddd;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .error {
            color: #dc3545;
            margin-top: 10px;
            display: none;
            text-align: center;
        }
        .error.active {
            display: block;
        }
        .video-info {
            text-align: center;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Instagram Downloader</h1>
        <p class="subtitle">Download videos without watermark</p>
        
        <div class="input-group">
            <input type="text" id="url" placeholder="Paste Instagram URL here...">
            <button id="downloadBtn" onclick="download()">Download</button>
        </div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing... Please wait</p>
        </div>
        
        <div class="result" id="result">
            <img id="thumbnail" class="thumbnail" src="" alt="Thumbnail">
            <div class="video-info">
                <h3 id="title">Video Title</h3>
                <p id="author"></p>
            </div>
            <a id="downloadLink" href="#" class="download-btn" target="_blank">⬇️ Download Video</a>
        </div>
        
        <div class="error" id="error"></div>
    </div>

    <script>
        async function download() {
            const url = document.getElementById('url').value.trim();
            const btn = document.getElementById('downloadBtn');
            
            if (!url || !url.includes('instagram.com')) {
                showError('Please enter a valid Instagram URL');
                return;
            }
            
            document.getElementById('loading').classList.add('active');
            document.getElementById('result').classList.remove('active');
            document.getElementById('error').classList.remove('active');
            btn.disabled = true;
            btn.textContent = 'Processing...';
            
            try {
                const response = await fetch('/api/instagram/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch video');
                }
                
                document.getElementById('thumbnail').src = data.data.thumbnail;
                document.getElementById('title').textContent = data.data.title;
                document.getElementById('author').textContent = 'By: ' + (data.data.author || 'Unknown');
                document.getElementById('downloadLink').href = data.data.downloadUrl;
                document.getElementById('result').classList.add('active');
                
            } catch (err) {
                showError(err.message);
            } finally {
                document.getElementById('loading').classList.remove('active');
                btn.disabled = false;
                btn.textContent = 'Download';
            }
        }
        
        function showError(msg) {
            const errorEl = document.getElementById('error');
            errorEl.textContent = msg;
            errorEl.classList.add('active');
            setTimeout(() => errorEl.classList.remove('active'), 5000);
        }
        
        document.getElementById('url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') download();
        });
    </script>
</body>
</html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error'
  });
});

// For local development
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(\`🚀 Server running on http://localhost:${PORT}\`);
  });
}

module.exports = app;
