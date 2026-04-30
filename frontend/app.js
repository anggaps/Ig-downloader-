document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const thumbnail = document.getElementById('thumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const downloadLink = document.getElementById('downloadLink');
    const historyList = document.getElementById('historyList');
    const themeToggle = document.getElementById('themeToggle');

    // Theme toggle
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });

    function updateThemeIcon(theme) {
        themeToggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    // Load history
    loadHistory();

    downloadBtn.addEventListener('click', handleDownload);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDownload();
    });

    async function handleDownload() {
        const url = urlInput.value.trim();
        
        if (!url || !url.includes('instagram.com')) {
            showError('Please enter a valid Instagram URL');
            return;
        }

        showLoading();
        hideResult();
        hideError();

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

            showResult(data.data);
            addToHistory(data.data);
        } catch (err) {
            showError(err.message);
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        loading.classList.remove('hidden');
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    function hideLoading() {
        loading.classList.add('hidden');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    }

    function showResult(data) {
        thumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        downloadLink.href = data.downloadUrl;
        downloadLink.download = `instagram-video-${Date.now()}.mp4`;
        result.classList.remove('hidden');
    }

    function hideResult() {
        result.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        error.classList.remove('hidden');
        setTimeout(hideError, 8000);
    }

    function hideError() {
        error.classList.add('hidden');
    }

    function addToHistory(data) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <img src="${data.thumbnail}" alt="thumbnail" onerror="this.src='https://via.placeholder.com/60x60/333/fff?text=IG'">
            <div class="info">
                <div class="title">${data.title}</div>
                <div class="date">${new Date().toLocaleString()}</div>
            </div>
            <a href="${data.downloadUrl}" class="btn-download" download title="Download">
                <i class="fas fa-download"></i>
            </a>
        `;
        
        const empty = historyList.querySelector('.empty');
        if (empty) empty.remove();
        
        historyList.prepend(item);
    }

    async function loadHistory() {
        try {
            const response = await fetch('/api/instagram/history');
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                historyList.innerHTML = '';
                data.data.forEach(item => addToHistory(item));
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }
});
