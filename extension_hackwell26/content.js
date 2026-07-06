// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
        try {
            // 1. Extract Text
            const textElements = document.querySelectorAll('p, h1, h2, h3, li, button');

            const textData = [];
            let index = 0;

            textElements.forEach((el) => {
                const text = el.innerText.trim();

                if (text.length > 10) {
                    const id = `text-${index++}`;
                    el.setAttribute('data-ml-id', id);

                    textData.push({ id, text });
                }
            });

            // 2. Extract Images
            const imgElements = document.querySelectorAll('img');
            const imageData = Array.from(imgElements).map((img, i) => {
                const id = `img-${i}`;
                img.setAttribute('data-ml-id', id);
                const url = img.src || img.getAttribute('data-src') || img.currentSrc;
                return { id: id, url: url };
            }).filter(img => img.url && (img.url.startsWith('http') || img.url.startsWith('file://')));

            // 3. Extract Videos (HTML5 and Embeds)
            const videoElements = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
            const videoData = Array.from(videoElements).map((vid, i) => {
                const id = `video-${i}`;
                vid.setAttribute('data-ml-id', id);
                // For <video> tags, grab src; for iframes, grab the embed URL
                const url = vid.currentSrc || vid.getAttribute('data-src') || vid.currentSrc;
                console.log("VIDEO URLS:\n",url);
                return { id: id, url: url, type: vid.tagName.toLowerCase() };
            }).filter(vid => vid.url && (vid.url.startsWith('http') || vid.url.startsWith('file://')));

            console.log("VIDEO FINAL LENGTH : ",videoData.length);

            // 4. SEND RESPONSE
            sendResponse({ 
                textData: textData, 
                imageData: imageData, 
                videoData: videoData 
            });
            
        } catch (error) {
            console.error("Extraction Error:", error);
            sendResponse({ textData: [], imageData: [], videoData: [] });
        }
    }

    if (request.action === "highlight") {
        if (request.ids && Array.isArray(request.ids)) {
            request.ids.forEach(id => {
                const el = document.querySelector(`[data-ml-id="${id}"]`);
                if (el) {
                    // Apply visual border for images and videos
                    if (['IMG', 'VIDEO', 'IFRAME'].includes(el.tagName)) {
                        el.style.outline = "5px solid #f10909";
                        el.style.outlineOffset = "-5px";
                    } else {
                        el.style.backgroundColor = "#fff0f0";
                        el.style.borderLeft = "5px solid #f10909";
                        el.style.padding = "5px";
                    }
                }
            });
        }
        sendResponse({ status: "done" });
    }

    return true; 
});
