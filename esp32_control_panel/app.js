document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('ipAddress');
    const btnCapture = document.getElementById('btnCapture');
    const btnSave = document.getElementById('btnSave');
    const btnSpeaker = document.getElementById('btnSpeaker');
    
    const placeholder = document.getElementById('placeholder');
    const cameraStream = document.getElementById('cameraStream');
    const loader = document.getElementById('loader');
    const notification = document.getElementById('notification');

    let currentImageUrl = null;
    let speakerActive = false;

    // Helper to get base URL
    const getBaseUrl = () => {
        const ip = ipInput.value.trim();
        if (!ip) {
            showNotification('Please enter ESP32 IP address', true);
            return null;
        }
        // Assume http:// if not provided
        return ip.startsWith('http') ? ip : `http://${ip}`;
    };

    // Show temporary notification
    const showNotification = (message, isError = false) => {
        notification.textContent = message;
        notification.style.background = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
        notification.classList.remove('hidden');
        
        // Trigger reflow to restart animation if needed
        void notification.offsetWidth;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.classList.add('hidden'), 300);
        }, 3000);
    };

    // Capture Image
    btnCapture.addEventListener('click', async () => {
        const baseUrl = getBaseUrl();
        if (!baseUrl) return;

        // Update UI state
        btnCapture.disabled = true;
        placeholder.classList.add('hidden');
        cameraStream.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            // Add timestamp to prevent browser caching
            const timestamp = new Date().getTime();
            const imageUrl = `${baseUrl}/capture?t=${timestamp}`;
            
            // We fetch it as a blob so we can display it reliably even with CORS constraints on canvas
            const response = await fetch(imageUrl, {
                // Consider adding mode: 'no-cors' if ESP32 doesn't send CORS headers, 
                // but note that no-cors prevents reading the blob for saving. 
                // It's best if ESP32 handles CORS properly.
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const blob = await response.blob();
            
            if (currentImageUrl) {
                URL.revokeObjectURL(currentImageUrl);
            }
            currentImageUrl = URL.createObjectURL(blob);
            
            cameraStream.src = currentImageUrl;
            
            // Wait for image to load before showing it
            cameraStream.onload = () => {
                loader.classList.add('hidden');
                cameraStream.classList.remove('hidden');
                btnCapture.disabled = false;
                btnSave.disabled = false;
                showNotification('Image captured successfully!');
            };
        } catch (error) {
            console.error('Capture error:', error);
            loader.classList.add('hidden');
            
            if (!currentImageUrl) {
                placeholder.classList.remove('hidden');
            } else {
                cameraStream.classList.remove('hidden');
            }
            
            btnCapture.disabled = false;
            showNotification('Failed to capture image. Check IP.', true);
        }
    });

    // Save Image
    btnSave.addEventListener('click', () => {
        if (!currentImageUrl) return;
        
        const a = document.createElement('a');
        a.href = currentImageUrl;
        a.download = `esp32_capture_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('Image saved to device');
    });

    // Trigger Speaker Alarm
    btnSpeaker.addEventListener('click', async () => {
        const baseUrl = getBaseUrl();
        if (!baseUrl) return;

        btnSpeaker.disabled = true;
        const originalText = btnSpeaker.innerHTML;
        btnSpeaker.innerHTML = '<i data-lucide="volume-2"></i><span>Playing Sound...</span>';
        lucide.createIcons();
        
        try {
            const response = await fetch(`${baseUrl}/speaker`, { method: 'GET' });
            if (!response.ok) throw new Error('HTTP error');
            showNotification('Alarm Triggered!');
            
            // Re-enable button after 4 seconds (time it takes for ESP32 sound to finish)
            setTimeout(() => {
                btnSpeaker.innerHTML = originalText;
                lucide.createIcons();
                btnSpeaker.disabled = false;
            }, 4000);
            
        } catch (error) {
            console.error('Speaker error:', error);
            showNotification('Failed to trigger speaker', true);
            btnSpeaker.innerHTML = originalText;
            lucide.createIcons();
            btnSpeaker.disabled = false;
        }
    });
});
