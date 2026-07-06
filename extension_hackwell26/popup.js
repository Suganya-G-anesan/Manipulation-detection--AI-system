
// console.log("Manipulation Detector: popup.js Loaded");

// document.getElementById("check").addEventListener("click", async () => {
//     const btn = document.getElementById("check");
//     const loader = document.getElementById("loader");
//     const resultDiv = document.getElementById("result");
//     const dashboard = document.getElementById("summary-dashboard");

//     let totalItems = 0;
//     let processedItems = 0;
//     let manipulativeCount = 0;

//     // 🔄 UI START
//     btn.disabled = true;
//     btn.innerText = "Analyzing...";
//     loader.classList.remove("hidden");
//     resultDiv.innerHTML = "";
//     dashboard.classList.add("hidden");

//     try {
//         let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//         chrome.tabs.sendMessage(tab.id, { action: "extract" }, async (response) => {

//             if (!response) {
//                 showErrorMessage("Nothing found to analyze.");
//                 return resetUI();
//             }

//             const { textData = [], imageData = [], videoData = [] } = response;

//             totalItems = textData.length + imageData.length + videoData.length;

//             // ===============================
//             // 🧠 TEXT PROCESSING (STREAM)
//             // ===============================
//             (async () => {
//                 try {
//                     console.log("TEXT PROCESSING STARTED");

//                     for (let i = 0; i < textData.length; i++) {
//                         const t = textData[i];

//                         try {
//                             const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze", {
//                                 method: "POST",
//                                 headers: { "Content-Type": "application/json" },
//                                 body: JSON.stringify({
//                                     texts: [t.text], // ✅ ONLY ONE TEXT
//                                     lang: "en"
//                                 }),
//                             });

//                             const data = await res.json();
//                             console.log("TEXT ANALYSIS:\n", data.result);

//                             let raw = data.result || "";
//                             raw = raw.replace(/```json|```/g, "").trim();

//                             let parsed;
//                             try {
//                                 parsed = JSON.parse(raw);
//                             } catch {
//                                 const match = raw.match(/\{[\s\S]*\}/);
//                                 parsed = match ? JSON.parse(match[0]) : null;
//                             }

//                             const item = Array.isArray(parsed) ? parsed[0] : parsed;

//                             processedItems++; // ✅ increments correctly

//                             if (item?.manipulative) {
//                                 manipulativeCount++;

//                                 resultDiv.insertAdjacentHTML("beforeend",
//                                     createCard("TEXT", t.text, item.explanation, item.technique, t.id, true)
//                                 );

//                                 chrome.tabs.sendMessage(tab.id, {
//                                     action: "highlight",
//                                     ids: [t.id]
//                                 });
//                             }

//                             updateDashboard(totalItems, processedItems, manipulativeCount);

//                         } catch (err) {
//                             console.error("Single text error:", err);
//                             processedItems++; // ⚠️ still increment to avoid stuck UI
//                             updateDashboard(totalItems, processedItems, manipulativeCount);
//                         }
//                     }

//                 } catch (err) {
//                     console.error("Text error:", err);
//                 }
//             })();


//             // ===============================
//             // 🖼️ IMAGE PROCESSING (STREAM)
//             // ===============================
//             for (const img of imageData) {
//     try {
//         const blob = await (await fetch(img.url)).blob();
//         const formData = new FormData();
//         formData.append("file", blob, "image.jpg");

//         console.log("IMAGE PROCESSING STARTED");

//         const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze-image", {
//             method: "POST",
//             body: formData
//         });

//         const data = await res.json();
//         console.log("IMAGE ANALYSIS :\n", data.result);

//         const analysis = parseLLMResponse(data.result);

//         processedItems++;

//         // ✅ CORRECT KEY
//         if (analysis.manipulative) {
//             manipulativeCount++;

//             resultDiv.insertAdjacentHTML("beforeend",
//                 createCard("IMAGE", img.url, analysis.explanation, "Visual Manipulation", img.id, true)
//             );

//             chrome.tabs.sendMessage(tab.id, {
//                 action: "highlight",
//                 ids: [img.id]
//             });
//         }

//         updateDashboard(totalItems, processedItems, manipulativeCount);

//     } catch (err) {
//         console.error("Image error:", err);
//         processedItems++;
//         updateDashboard(totalItems, processedItems, manipulativeCount);
//     }
// }


//             // ===============================
//             // 🎥 VIDEO PROCESSING (STREAM)
//             // ===============================
//             videoData.forEach(async (vid) => {
//                 try {
//                     const blob = await (await fetch(vid.url)).blob();
//                     const formData = new FormData();
//                     formData.append("file", blob, "video.mp4");

//                     console.log("VIDEO PROCESSING STARTED");

//                     const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze-video", {
//                         method: "POST",
//                         body: formData
//                     });

//                     const text = await res.text();

//                     let data;
//                     try {
//                         data = JSON.parse(text);
//                     } catch {
//                         console.error("Video returned HTML:", text);
//                         return;
//                     }

//                     console.log("VIDEO ANALYSIS :\n", data.result);

//                     const analysis = parseLLMResponse(data.result);

//                     processedItems++;

//                     if (analysis.is_manipulative) {
//                         manipulativeCount++;

//                         resultDiv.insertAdjacentHTML("beforeend",
//                             createCard("VIDEO", vid.url, analysis.explanation, "Video Manipulation", vid.id, true)
//                         );

//                         chrome.tabs.sendMessage(tab.id, {
//                             action: "highlight",
//                             ids: [vid.id]
//                         });
//                     }

//                     updateDashboard(totalItems, processedItems, manipulativeCount);

//                 } catch (err) {
//                     console.error("Video error:", err);
//                 }
//             });

            
//         });

//     } catch (err) {
//         console.error(err);
//         showErrorMessage("Connection error.");
//         resetUI();
//     }
// });


// // ===============================
// // 🧠 HELPERS
// // ===============================
// function parseLLMResponse(rawText) {
//     if (!rawText) {
//         return { is_manipulative: false, explanation: "No response" };
//     }

//     const clean = rawText.toLowerCase();

//     const explanation =
//         rawText.split(/explanation\s*:/i)[1]?.split(/solution\s*:/i)[0] || rawText;

//     return {
//         is_manipulative: clean.includes("manipulative:true"),
//         explanation: explanation.trim()
//     };
// }


// // ===============================
// // 🎨 UI COMPONENTS
// // ===============================
// function createCard(type, source, reason, technique, id, isBad) {

//     let content = "";

//     if (type === "IMAGE") {
//         content = `<img src="${source}" style="width:100%;border-radius:8px;">`;
//     }
//     else if (type === "VIDEO") {
//         content = `<p>🎥 Video<br><small>${source}</small></p>`;
//     }
//     else {
//         content = `<p>"${source}"</p>`;
//     }

//     return `
//         <div class="result-section ${isBad ? 'manipulative' : 'safe'}">
//             <div class="card-header">
//                 <span>${type}</span>
//                 <span>ID: ${id}</span>
//             </div>

//             <div>${content}</div>

//             <div><b>${technique}</b></div>

//             <div>${reason}</div>
//         </div>
//     `;
// }


// // ===============================
// // 📊 DASHBOARD
// // ===============================
// // function updateDashboard(total, processed, found) {
// //     const dashboard = document.getElementById("summary-dashboard");
// //     dashboard.classList.remove("hidden");

// //     const rate = total > 0 ? (found / total) * 100 : 0;

// //     let riskClass = rate > 60 ? "risk-high" : (found > 0 ? "risk-medium" : "risk-low");
// //     let riskText = rate > 60 ? "HIGH" : (found > 0 ? "MOD" : "SAFE");

// //     dashboard.innerHTML = `
// //         <div>Processed: ${processed}/${total}</div>
// //         <div>Detected: ${found}</div>
// //         <div class="${riskClass}">Risk: ${riskText}</div>
// //     `;
// // }

// function updateDashboard(total, processed, found) {
//     const dashboard = document.getElementById("summary-dashboard");
//     dashboard.classList.remove("hidden");

//     const rate = total > 0 ? (found / total) * 100 : 0;

//     let riskClass = rate > 60 ? "risk-high" : (found > 0 ? "risk-medium" : "risk-low");
//     let riskText = rate > 60 ? "HIGH" : (found > 0 ? "MOD" : "SAFE");

//     dashboard.innerHTML = `
//         <div>Processed: ${processed}/${total}</div>
//         <div>Detected: ${found}</div>
//         <div class="${riskClass}">Risk: ${riskText}</div>
//     `;

//     // ✅ STOP LOADER WHEN DONE
//     if (processed >= total) {
//         console.log("ALL PROCESSING DONE");

//         document.getElementById("loader").classList.add("hidden");

//         const btn = document.getElementById("check");
//         btn.disabled = false;
//         btn.innerText = "Analyze Page";
//     }
// }


// // ===============================
// // ❌ ERROR UI
// // ===============================
// function showErrorMessage(msg) {
//     document.getElementById("loader").classList.add("hidden");

//     document.getElementById("result").innerHTML = `
//         <div class="result-section manipulative">
//             ${msg}
//         </div>
//     `;
// }


// // ===============================
// // 🔄 RESET UI
// // ===============================
// function resetUI() {
//     const btn = document.getElementById("check");

//     btn.disabled = false;
//     btn.innerText = "Analyze Page";

//     document.getElementById("loader").classList.add("hidden");
// }






console.log("Manipulation Detector: popup.js Loaded");

document.getElementById("check").addEventListener("click", async () => {
    const btn = document.getElementById("check");
    const loader = document.getElementById("loader");
    const resultDiv = document.getElementById("result");
    const dashboard = document.getElementById("summary-dashboard");

    let totalItems = 0;
    let processedItems = 0;
    let manipulativeCount = 0;

    // 🔄 UI START
    btn.disabled = true;
    btn.innerText = "Analyzing...";
    loader.classList.remove("hidden");
    resultDiv.innerHTML = "";
    dashboard.classList.add("hidden");

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const websiteUrl = tab.url;
        console.log("Website URL:", websiteUrl);

        chrome.tabs.sendMessage(tab.id, { action: "extract" }, async (response) => {

            if (!response) {
                showErrorMessage("Nothing found to analyze.");
                return resetUI();
            }

            const { textData = [], imageData = [], videoData = [] } = response;

            totalItems = textData.length + imageData.length + videoData.length;

            // ===============================
            // 🧠 TEXT PROCESSING
            // ===============================
            (async () => {
                console.log("TEXT PROCESSING STARTED");

                for (const t of textData) {
                    try {
                        const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                texts: [t.text],
                                lang: "en",
                                user_email : "user@gmail.com",
                                source: "extension",
                                website:websiteUrl
                            }),
                        });

                        const data = await res.json();

                        const analysis = parseLLMResponse(data.result);

                        processedItems++;

                        if (analysis.manipulative) {
                            manipulativeCount++;

                            resultDiv.insertAdjacentHTML("beforeend",
                                createCard("TEXT", t.text, analysis.explanation, analysis.technique, t.id, true)
                            );

                            chrome.tabs.sendMessage(tab.id, {
                                action: "highlight",
                                ids: [t.id]
                            });
                        }

                        updateDashboard();

                    } catch (err) {
                        console.error("Text error:", err);
                        processedItems++;
                        updateDashboard();
                    }
                }
            })();

            // ===============================
            // 🖼️ IMAGE PROCESSING
            // ===============================
            (async () => {
                console.log("IMAGE PROCESSING STARTED");

                for (const img of imageData) {
                    try {
                        const blob = await (await fetch(img.url)).blob();
                        const formData = new FormData();
                        formData.append("file", blob, "image.jpg");

                        formData.append("user_email", "user@gmail.com");
                        formData.append("source", "extension");
                        formData.append("website", websiteUrl); 

                        const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze-image", {
                            method: "POST",
                            body: formData
                        });

                        const data = await res.json();

                        const analysis = parseLLMResponse(data.result);

                        processedItems++;

                        if (analysis.manipulative) {
                            manipulativeCount++;

                            resultDiv.insertAdjacentHTML("beforeend",
                                createCard("IMAGE", img.url, analysis.explanation, analysis.technique, img.id, true)
                            );

                            chrome.tabs.sendMessage(tab.id, {
                                action: "highlight",
                                ids: [img.id]
                            });
                        }

                        updateDashboard();

                    } catch (err) {
                        console.error("Image error:", err);
                        processedItems++;
                        updateDashboard();
                    }
                }
            })();

            // ===============================
            // 🎥 VIDEO PROCESSING
            // ===============================
            (async () => {
                console.log("VIDEO PROCESSING STARTED");

                for (const vid of videoData) {
                    try {
                        const blob = await (await fetch(vid.url)).blob();
                        const formData = new FormData();
                        formData.append("file", blob, "video.mp4");

                        formData.append("user_email", "user@gmail.com");
                        formData.append("source", "extension");
                        formData.append("website", websiteUrl); 

                        const res = await fetch("https://unrequested-willow-continuatively.ngrok-free.dev/analyze-video", {
                            method: "POST",
                            body: formData
                        });

                        const data = await res.json();

                        const analysis = parseLLMResponse(data.result);

                        processedItems++;

                        if (analysis.manipulative) {
                            manipulativeCount++;

                            resultDiv.insertAdjacentHTML("beforeend",
                                createCard("VIDEO", vid.url, analysis.explanation, analysis.technique, vid.id, true)
                            );

                            chrome.tabs.sendMessage(tab.id, {
                                action: "highlight",
                                ids: [vid.id]
                            });
                        }

                        updateDashboard();

                    } catch (err) {
                        console.error("Video error:", err);
                        processedItems++;
                        updateDashboard();
                    }
                }
            })();
        });

    } catch (err) {
        console.error(err);
        showErrorMessage("Connection error.");
        resetUI();
    }

    // ===============================
    // 📊 DASHBOARD FUNCTION
    // ===============================
    const CIRC = 113.1;

    function updateDashboard() {
        dashboard.classList.remove("hidden");

        const safeCount = processedItems - manipulativeCount;
        const pct       = totalItems > 0 ? manipulativeCount / totalItems * 100 : 0;
        const rate      = pct;
        const offset    = (CIRC * (1 - manipulativeCount / (totalItems || 1))).toFixed(2);

        const riskClass = rate > 60 ? "high" : manipulativeCount > 0 ? "mod" : "low";
        const riskText  = rate > 60 ? "HIGH" : manipulativeCount > 0 ? "MOD" : "SAFE";
        const color     = rate > 60 ? "#e84855" : manipulativeCount > 0 ? "#f5a623" : "#43d19e";

        dashboard.innerHTML = `
            <div class="db-row1">
                <div class="db-left">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="18" fill="none"
                            stroke="rgba(255,255,255,0.07)" stroke-width="4"/>
                        <circle cx="24" cy="24" r="18" fill="none"
                            stroke="${color}" stroke-width="4"
                            stroke-dasharray="${CIRC}"
                            stroke-dashoffset="${offset}"
                            stroke-linecap="round"
                            transform="rotate(-90 24 24)"/>
                        <text x="24" y="27" text-anchor="middle"
                            font-size="10" font-weight="600" fill="#f0f2f8"
                            font-family="-apple-system,sans-serif"
                            letter-spacing="-0.03em">${Math.round(pct)}%</text>
                    </svg>
                    <div class="divider-v"></div>
                    <div class="scan-block">
                        <span class="db-val">${processedItems}/${totalItems}</span>
                        <span class="db-label">Scanned</span>
                    </div>
                </div>
                <div class="risk-chip ${riskClass}">
                    <span class="risk-dot" style="background:${color}"></span>
                    ${riskText}
                </div>
            </div>
            <div class="divider-h"></div>
            <div class="db-row2">
                <div class="bar-row">
                    <span class="bar-lbl">Flagged</span>
                    <div class="bar-track">
                        <div class="bar-fill flag" style="width:${pct}%"></div>
                    </div>
                    <span class="bar-num flag">${manipulativeCount}</span>
                </div>
                <div class="bar-row">
                    <span class="bar-lbl">Safe</span>
                    <div class="bar-track">
                        <div class="bar-fill safe"
                            style="width:${totalItems > 0 ? safeCount/totalItems*100 : 0}%">
                        </div>
                    </div>
                    <span class="bar-num safe">${safeCount}</span>
                </div>
            </div>
        `;

        if (processedItems >= totalItems) {
            loader.classList.add("hidden");
            btn.disabled = false;
            btn.innerText = "Analyze Page";
        }
    }
});


// ===============================
// 🧠 PARSER (FIXED)
// ===============================
function parseLLMResponse(raw) {
    try {
        if (!raw) return { manipulative: false };

        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

        return {
            manipulative: parsed.manipulative || false,
            explanation: parsed.explanation || "No explanation",
            technique: parsed.technique || "Unknown"
        };

    } catch (err) {
        console.error("Parse error:", err);
        return { manipulative: false, explanation: "Parse failed", technique: "Unknown" };
    }
}


// ===============================
// 🎨 UI CARD
// ===============================
function createCard(type, source, reason, technique, id, isBad) {

    let content = "";

    if (type === "IMAGE") {
        content = `<h3>INPUT:</h3><img src="${source}" style="width:100%;border-radius:8px;">`;
    }
    else if (type === "VIDEO") {
        content = `<h3>INPUT:</h3><p>🎥 Video<br><small>${source}</small></p>`;
    }
    else {
        content = `<h3>INPUT:</h3><p style="color:#ff6b35;">${source}</p>`;
    }

    return `
        <div class="result-section ${isBad ? 'manipulative' : 'safe'}">
            <div class="card-header">
                <span>${type}</span>
                <span>ID: ${id}</span>
            </div>

            <div>${content}</div>

            <div><b style="color:#34d399;padding:10px;">${technique}</b></div>

            <div style="padding:10px;">${reason}</div>
        </div>
    `;
}


// ===============================
// ❌ ERROR UI
// ===============================
function showErrorMessage(msg) {
    document.getElementById("loader").classList.add("hidden");

    document.getElementById("result").innerHTML = `
        <div class="result-section manipulative">
            ${msg}
        </div>
    `;
}


// ===============================
// 🔄 RESET UI
// ===============================
function resetUI() {
    const btn = document.getElementById("check");

    btn.disabled = false;
    btn.innerText = "Analyze Page";

    document.getElementById("loader").classList.add("hidden");
}