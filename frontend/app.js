// Configuration
// When deployed on Vercel, set this to your Render backend URL
const API_URL = window.ENV_API_URL || window.location.origin;
const EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral'];

// Add error handling for fetch requests
async function safeFetch(url, options) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}
const COLORS = {
    angry: '#ff0000',
    disgust: '#800080',
    fear: '#808080',
    happy: '#ffff00',
    sad: '#0000ff',
    surprise: '#ffa500',
    neutral: '#00ff00'
};

// DOM Elements
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const snapshotBtn = document.getElementById('snapshot');
const gallery = document.getElementById('gallery');

// Chart setup
const emotionChart = new Chart(document.getElementById('emotionChart'), {
    type: 'line',
    data: {
        labels: [],
        datasets: EMOTIONS.map(emotion => ({
            label: emotion,
            data: [],
            borderColor: COLORS[emotion],
            fill: false,
            tension: 0.4
        }))
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                max: 1
            }
        }
    }
});

// Initialize webcam
async function initializeWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        // Set canvas size after video loads
        video.addEventListener('loadedmetadata', () => {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
    }
}

// Detect emotions in image
async function detectEmotions(imageData) {
    try {
        return await safeFetch(`${API_URL}/detect`, {
            method: 'POST',
            body: JSON.stringify({ image: imageData })
        });
    } catch (error) {
        console.error('Error detecting emotions:', error);
        throw error;
    }
}

// Draw bounding boxes and labels
function drawDetections(faces) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    faces.forEach(face => {
        const [x, y, width, height] = face.box;
        const emotion = face.dominant_emotion;
        
        // Draw box
        ctx.strokeStyle = COLORS[emotion];
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label
        ctx.fillStyle = COLORS[emotion];
        ctx.font = '16px Arial';
        ctx.fillText(emotion, x, y - 5);
    });
}

// Update emotion history chart
function updateChart(faces) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Add timestamp to labels
    emotionChart.data.labels.push(timestamp);
    if (emotionChart.data.labels.length > 20) {
        emotionChart.data.labels.shift();
    }
    
    // Update emotion values
    EMOTIONS.forEach((emotion, index) => {
        let value = 0;
        if (faces.length > 0) {
            value = faces[0].emotions[emotion];
        }
        
        emotionChart.data.datasets[index].data.push(value);
        if (emotionChart.data.datasets[index].data.length > 20) {
            emotionChart.data.datasets[index].data.shift();
        }
    });
    
    emotionChart.update();
}

// Take snapshot
async function takeSnapshot() {
    try {
        if (!video.videoWidth || !video.videoHeight) {
            throw new Error('Video stream not ready');
        }

        // Create temporary canvas for snapshot
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        if (!context) {
            throw new Error('Could not get canvas context');
        }
        
        // Draw video frame and overlay
        context.drawImage(video, 0, 0);
        context.drawImage(overlay, 0, 0);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Disable snapshot button while processing
        const snapshotBtn = document.getElementById('snapshot');
        snapshotBtn.disabled = true;
        snapshotBtn.textContent = 'Saving...';
        
        try {
            // Save snapshot
            const result = await safeFetch(`${API_URL}/save_snapshot`, {
                method: 'POST',
                body: JSON.stringify({
                    image: imageData,
                    timestamp: Date.now()
                })
            });
            console.log('Snapshot result:', result);
            
            if (result.success) {
                // Add to gallery
                const container = document.createElement('div');
                container.className = 'snapshot-container';
                
                const img = document.createElement('img');
                img.src = imageData;
                img.className = 'snapshot-item';
                
                // Add timestamp
                const timestamp = document.createElement('div');
                timestamp.className = 'snapshot-timestamp';
                timestamp.textContent = new Date().toLocaleString();
                
                container.appendChild(img);
                container.appendChild(timestamp);
                gallery.prepend(container);
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = 'Snapshot saved successfully!';
                document.body.appendChild(successMsg);
                
                setTimeout(() => {
                    successMsg.remove();
                }, 3000);
            }
        } finally {
            // Re-enable snapshot button
            snapshotBtn.disabled = false;
            snapshotBtn.textContent = 'Take Snapshot';
        }
    } catch (error) {
        console.error('Error saving snapshot:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = `Error: ${error.message}`;
        document.body.appendChild(errorMsg);
        
        setTimeout(() => {
            errorMsg.remove();
        }, 5000);
    }
}

// Main detection loop
async function detectionLoop() {
    // Create temporary canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let consecutiveErrors = 0;
    
    while (true) {
        try {
            // Ensure video dimensions are set
            if (video.videoWidth && video.videoHeight) {
                // Update canvas dimensions if needed
                if (canvas.width !== video.videoWidth) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                // Draw current video frame
                context.drawImage(video, 0, 0);
                
                // Get image data and detect emotions
                const imageData = canvas.toDataURL('image/jpeg', 0.3);
                const result = await detectEmotions(imageData);
                
                if (result && result.faces) {
                    drawDetections(result.faces);
                    updateChart(result.faces);
                    consecutiveErrors = 0; // Reset error counter on success
                }
            }
        } catch (error) {
            console.error('Error in detection loop:', error);
            consecutiveErrors++;
            
            if (consecutiveErrors >= 3) {
                // Show error message to user after 3 consecutive errors
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Connection issues detected. Trying to reconnect...';
                document.body.appendChild(errorMsg);
                
                // Remove message after 3 seconds
                setTimeout(() => {
                    errorMsg.remove();
                }, 3000);
                
                // Wait a bit longer between retries
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

// Keep backend alive by pinging every 10 minutes
setInterval(() => {
    fetch(`${API_URL}/`).catch(() => {});
}, 10 * 60 * 1000);

// Event listeners
snapshotBtn.addEventListener('click', takeSnapshot);

// Initialize
initializeWebcam().then(() => {
    video.addEventListener('play', () => {
        detectionLoop();
    });
});