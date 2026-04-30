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

// Serve static frontend
app.use(express.static('public'));

// Fallback to index.html for SPA
app.get('/', (req, res) => {
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
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
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
        }
        .download-btn {
            display: inline-block;
            padding: 12px 30px;
            background: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 10px;
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
        }
        .error.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📷 Instagram Downloader</h1>
        <p class="subtitle">Download videos without watermark</p>
        
        <div class="input-group">
            <input type="text" id="url" placeholder="Paste Instagram URL here...">
            <button onclick="download()">Download</button>
        </div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing...</p>
        </div>
        
        <div class="result" id="result">
            <img id="thumbnail" class="thumbnail" src="" alt="Thumbnail">
            <h3 id="title">Video Title</h3>
            <a id="downloadLink" href="#" class="download-btn" download>Download Video</a>
        </div>
        
        <div class="error" id="error"></div>
    </div>

    <script>
        async function download() {
            const url = document.getElementById('url').value;
            if (!url.includes('instagram.com')) {
                showError('Please enter a valid Instagram URL');
                return;
            }
            
            document.getElementById('loading').classList.add('active');
            document.getElementById('result').classList.remove('active');
            document.getElementById('error').classList.remove('active');
            
            try {
                const response = await fetch('/api/instagram/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error);
                }
                
                document.getElementById('thumbnail').src = data.data.thumbnail;
                document.getElementById('title').textContent = data.data.title;
                document.getElementById('downloadLink').href = data.data.downloadUrl;
                document.getElementById('result').classList.add('active');
                
            } catch (err) {
                showError(err.message);
            } finally {
                document.getElementById('loading').classList.remove('active');
            }
        }
        
        function showError(msg) {
            document.getElementById('error').textContent = msg;
            document.getElementById('error').classList.add('active');
        }
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
