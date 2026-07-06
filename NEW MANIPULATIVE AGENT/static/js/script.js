let currentDays = 1;
let charts = {};

// ════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════
function escHtml(t){
  return String(t)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');
}

let uploadedFiles = [];

function handleFileUpload(event) {
  const files = Array.from(event.target.files);

  if (uploadedFiles.length + files.length > 5) {
    showToast("Max 5 files allowed!");
    return;
  }

  const container = document.getElementById("filePreviewContainer");

  files.forEach(file => {
    uploadedFiles.push(file);

    const fileChip = document.createElement("div");
    fileChip.className = "file-chip";

    // Image preview
    if (file.type.startsWith("image")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      fileChip.appendChild(img);
    }

    // File name
    const name = document.createElement("span");
    name.textContent = file.name;
    fileChip.appendChild(name);

    // Remove button
    const remove = document.createElement("span");
    remove.textContent = "✕";
    remove.className = "remove-file";

    remove.onclick = () => {
      uploadedFiles = uploadedFiles.filter(f => f !== file);
      fileChip.remove();
    };

    fileChip.appendChild(remove);
    container.appendChild(fileChip);
  });

  // Reset input so same file can be selected again
  event.target.value = "";
}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.opacity='1';
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.style.opacity='0',2800);
}


// ════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════
function switchView(view,el){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  if(el) el.classList.add('active');
  const titles={chat:'Chat Agent',dashboard:'Detection Dashboard',recents:'Recent Searches'};
  const subs={chat:'Manipulative content detection · Real-time analysis',dashboard:'Analytics & insights · Click any chart to expand',recents:'History of your analysis queries · Click any to re-run'};
  document.getElementById('topbarTitle').textContent=titles[view]||view;
  document.getElementById('topbarSub').textContent=subs[view]||'';
  if(view!=='dashboard') document.getElementById('backBtn').classList.remove('visible');
  if(view === 'dashboard'){ 
  collapseChart(); 
  setTimeout(() => {
    toggleDashBtn(document.querySelector(".dash-btn.active"));
  }, 80); 
}
  if(view==='recents') renderRecents();
  closeDropdown();
}

function toggleSidebar(){
  const s=document.getElementById('sidebar');
  s.classList.toggle('collapsed');
  document.getElementById('toggleIcon').textContent=s.classList.contains('collapsed')?'▶':'◀';
}

async function toggleDashBtn(btn) {
  document.querySelectorAll(".dash-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  if (btn.innerText.includes("7")) currentDays = 7;
  else if (btn.innerText.includes("30")) currentDays = 30;
  else currentDays = 1;

  await initCharts();     // ✅ reload charts
  await loadDetections(); // ✅ reload table
}


// ════════════════════════════════════════
// 🔐 AUTH SYSTEM
// ════════════════════════════════════════
let currentUser = null;
const API_URL = "http://127.0.0.1:8000";

// Load user from storage
(function initAuth(){
  try{
    const s = localStorage.getItem('md_user');
    if(s){
      currentUser = JSON.parse(s);
      refreshUserUI();
    }
  }catch(e){}
})();

// Update UI
function refreshUserUI(){
  const av=document.getElementById('avatarBtn');
  const pn=document.getElementById('profileName');
  const pe=document.getElementById('profileEmail');

  if(currentUser){
    av.textContent=currentUser.initials || 'U';
    if(pn) pn.textContent=currentUser.name;
    if(pe) pe.textContent=currentUser.email;
  } else {
    av.textContent='👤';
    if(pn) pn.textContent='Guest User';
    if(pe) pe.textContent='Not signed in';
  }
}

// Save user
function saveUser(email,name){
  currentUser={ email, name, initials:(name || email)[0].toUpperCase() };

  localStorage.setItem('md_user',JSON.stringify(currentUser));

  refreshUserUI();
  hideModal();
  closeDropdown();

  showToast("Welcome " + name + " 👋");

  // ✅ LOAD DASHBOARD FOR NEW USER
  setTimeout(() => {
    initCharts();
    loadDetections();
  }, 100);
}

// Logout
function logout(){
  currentUser = null;
  localStorage.removeItem('md_user');

  refreshUserUI();
  closeDropdown();

  document.getElementById('chatMessages').innerHTML = `<div class="welcome-screen" id="welcomeScreen">
          <div class="welcome-icon">🔍</div>
          <div class="welcome-title">Detect <span>Manipulation</span> with AI</div>
          <div class="welcome-sub">Paste text, describe images, audio or video content. The AI agent will analyze and identify manipulative tactics, emotional triggers, and deceptive patterns.</div>
          <div class="quick-prompts">
            <div class="quick-prompt" onclick="sendQuick('Analyze this political speech for manipulative rhetoric')">🗣️ Analyze political speech</div>
            <div class="quick-prompt" onclick="sendQuick('Detect emotional manipulation in this advertisement')">📢 Check advertisement</div>
            <div class="quick-prompt" onclick="sendQuick('Identify dark patterns in this social media post')">📱 Social media post</div>
            <div class="quick-prompt" onclick="sendQuick('What types of manipulation can you detect?')">ℹ️ What can you detect?</div>
            <div class="quick-prompt" onclick="sendQuick('Show me an example manipulation analysis report')">📋 Example report</div>
          </div>
        </div>`;

  // ✅ DESTROY CHARTS
  destroyCharts();

  // ✅ RESET METRICS
  document.querySelector("#totalAnalyzed").textContent = "0";
  document.querySelector("#manipulationDetected").textContent = "0";
  document.querySelector("#highRisk").textContent = "0";
  document.querySelector("#avgConfidence").textContent = "0%";

  showToast("Logged out");
}

// Modal control
function showModal(tab){
  document.getElementById('authModal').classList.add('visible');
  switchTab(tab || 'login');
}

function hideModal(){
  document.getElementById('authModal').classList.remove('visible');
}

function switchTab(tab){
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabSignup').classList.toggle('active',tab==='signup');

  document.getElementById('loginForm').style.display =
    tab==='login' ? 'flex' : 'none';

  document.getElementById('signupForm').style.display =
    tab==='signup' ? 'flex' : 'none';
}

// Dropdown
function toggleDropdown(){
  if(!currentUser){
    showModal('login');
    return;
  }
  document.getElementById('profileDropdown').classList.toggle('visible');
}

function closeDropdown(){
  document.getElementById('profileDropdown').classList.remove('visible');
}

// Close dropdown outside click
document.addEventListener('click',e=>{
  if(!e.target.closest('.avatar-wrap')) closeDropdown();
});

// Close modal on overlay click
document.getElementById('authModal').addEventListener('click',e=>{
  if(e.target===document.getElementById('authModal')) hideModal();
});


// =========================
// 🔐 LOGIN (API)
// =========================
async function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  if(!email || !password){
    showToast('Enter email & password');
    return;
  }

  try{
    const res = await fetch(`${API_URL}/login`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ email,password })
    });

    const data = await res.json();

    if(!res.ok){
      showToast(data.detail || "Login failed");
      return;
    }

    saveUser(data.user.email, data.user.name);

  }catch(err){
    showToast("Backend not running");
  }
}


// =========================
// 📝 SIGNUP (API)
// =========================
async function doSignup(){
  const first_name = document.getElementById('signupFirst').value.trim();
  const last_name = document.getElementById('signupLast').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPass').value;
  const organisation = document.getElementById('signupOrg')?.value || "";

  if(!first_name || !email || !password){
    showToast("Fill required fields");
    return;
  }

  try{
    const res = await fetch(`${API_URL}/signup`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        first_name,
        last_name,
        email,
        password,
        organisation
      })
    });

    const data = await res.json();

    if(!res.ok){
      showToast(data.detail || "Signup failed");
      return;
    }

    showToast("Account created 🎉");
    switchTab('login');

  }catch(err){
    showToast("Backend not running");
  }
}


// =============load data history (model database)=====================

async function loadDetections() {
  console.log("load detection funciton enterd");
  const tbody = document.getElementById("detTable");
  if (!tbody) return;

  if (!currentUser || !currentUser.email) {
    console.warn("User not logged in");
    return;
  }

  try {
    console.log(currentUser.email);
    const res = await fetch(`${API_URL}/get-logs?user_email=${currentUser.email}&days=${currentDays}&limit=20`);
    const data = await res.json();
    console.log(data.data);
    const logs = data.data || [];

    tbody.innerHTML = logs.map(log => `
      <tr style="cursor:pointer")">
        <td>${getTypeIcon(log.type)} ${capitalize(log.type)}</td>
        <td>${log.manipulative ? "⚠ YES" : "✅ NO"}</td>
        <td>${formatTechnique(log.technique)}</td>
        <td>${getExplanation(log.result)}</td>
        <td>${timeAgo(log.created_at)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Error loading data</td></tr>`;
    console.error(err);
  }
}

function getTypeIcon(type) {
  return {
    text: "📝",
    image: "🖼️",
    video: "🎥",
    audio: "🎙️"
  }[type] || "❓";
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function formatTechnique(technique) {
  if (!technique || technique === "none") return "None";
  return technique.replaceAll("_", " ");
}

function getExplanation(result) {
  if (!result) return "--";

  let text = "--";

  if (typeof result === "object") {
    text = result.explanation || "--";
  } else {
    try {
      const parsed = JSON.parse(result);
      text = parsed.explanation || "--";
    } catch {
      text = result;
    }
  }

  // ✨ limit to 120 chars
  return text.length > 120 ? text.substring(0, 120) + "..." : text;
}

function timeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;

  return `${Math.floor(diff/86400)}d ago`;
}




// ════════════════════════════════════════
//  RECENTS
// ════════════════════════════════════════
const RECENTS_KEY='md_recents';
const RECENTS_MAX=50;

function getRecents(){ try{ return JSON.parse(localStorage.getItem(RECENTS_KEY))||[]; }catch(e){ return[]; } }

function addRecent(query,mediaType,riskLevel){
  const all=getRecents();
  all.unshift({id:Date.now(),query,mediaType,riskLevel:riskLevel||'unknown',time:new Date().toISOString()});
  if(all.length>RECENTS_MAX) all.pop();
  try{ localStorage.setItem(RECENTS_KEY,JSON.stringify(all)); }catch(e){}
  updateRecentsBadge();
}

function clearRecents(){
  try{ localStorage.removeItem(RECENTS_KEY); }catch(e){}
  updateRecentsBadge(); renderRecents();
  showToast('History cleared.');
}

function updateRecentsBadge(){
  const count=getRecents().length;
  const b=document.getElementById('recentsBadge');
  if(b) b.textContent=count>0?count:'';
}

function fmtTime(iso){
  const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);
  if(m<1) return 'just now';
  if(m<60) return m+'m ago';
  const h=Math.floor(m/60);
  if(h<24) return h+'h ago';
  return Math.floor(h/24)+'d ago';
}

function renderRecents(){
  const all=getRecents();
  const c=document.getElementById('recentsList');
  if(!all.length){
    c.innerHTML=`<div class="recents-empty">
      <div class="recents-empty-icon">🕓</div>
      <div class="recents-empty-title">No search history yet</div>
      <div class="recents-empty-sub">Your analysis queries will appear here after you start chatting.</div>
    </div>`; return;
  }
  const mi={text:'📝',image:'🖼️',audio:'🎙️',video:'🎥'};
  const rc={high:'risk-high',med:'risk-med',low:'risk-low'};
  const rl={high:'⚠ HIGH',med:'⚡ MED',low:'✅ LOW',unknown:'— N/A'};
  c.innerHTML=all.map(item=>`
    <div class="recent-item" onclick="loadRecent('${encodeURIComponent(item.query)}','${item.mediaType}')">
      <div class="recent-item-header">
        <div class="recent-item-query">${escHtml(item.query)}</div>
        <div class="recent-item-time">${fmtTime(item.time)}</div>
      </div>
      <div class="recent-item-meta">
        <span class="recent-item-type">${mi[item.mediaType]||'📝'} ${item.mediaType}</span>
        <span class="risk-badge ${rc[item.riskLevel]||''}" style="margin:0;font-size:11px;padding:2px 8px">${rl[item.riskLevel]||'— N/A'}</span>
      </div>
    </div>`).join('');
}

function loadRecent(enc,mediaType){
  switchView('chat',document.querySelector('[data-view="chat"]'));
  setTimeout(()=>{
    document.getElementById('mediaType').value=mediaType||'text';
    document.getElementById('chatInput').value=decodeURIComponent(enc);
    sendMessage();
  },200);
}


// ════════════════════════════════════════
//  CHAT
// ════════════════════════════════════════
function handleKey(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }
function autoResize(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function sendQuick(t){ document.getElementById('chatInput').value=t; sendMessage(); }

function addUserMsg(content, mediaType) {
  const c = document.getElementById('chatMessages');
  const ws = document.getElementById('welcomeScreen');
  if (ws) ws.remove();

  const lbl = { text:'📝 Text', image:'🖼️ Image', audio:'🎙️ Audio', video:'🎥 Video',agent:'🤖 Agent' };

  const el = document.createElement('div');
  el.className = 'msg user';

  let bubbleContent = "";

  // 🧠 TEXT MESSAGE
  if (typeof content === "string") {
    bubbleContent = escHtml(content);
  }

  // 🧠 FILE MESSAGE
  else if (content instanceof File) {
    const url = URL.createObjectURL(content);
    const type = content.type;

    // 🖼️ IMAGE
    if (type.startsWith("image")) {
      bubbleContent = `
        <img src="${url}" style="max-width:180px;border-radius:10px;" />
      `;
    }

    // 🎧 AUDIO
    else if (type.startsWith("audio")) {
      bubbleContent = `
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span>🎧 ${escHtml(content.name)}</span>
          <audio controls style="width:220px;">
            <source src="${url}" type="${type}">
            Your browser does not support audio.
          </audio>
        </div>
      `;
    }

    // 🎥 VIDEO
    else if (type.startsWith("video")) {
      bubbleContent = `
        <div style="display:flex;flex-direction:column;gap:6px;">
          <span>🎥 ${escHtml(content.name)}</span>
          <video controls style="width:220px;border-radius:8px;">
            <source src="${url}" type="${type}">
            Your browser does not support video.
          </video>
        </div>
      `;
    }

    // 📄 OTHER FILE
    else {
      bubbleContent = `🔗 ${escHtml(content.name)}`;
    }

  }
  
  const initial = currentUser ? currentUser.initials : 'U';

  el.innerHTML = `
    <div class="msg-avatar" style="background: linear-gradient(135deg, #f472b6, #9333ea);">${initial}</div>
    <div class="msg-content">
      ${mediaType !== 'text' ? `<div class="msg-media"><span>${lbl[mediaType]}</span></div>` : ''}
      <div class="msg-bubble">${bubbleContent}</div>
      <div class="msg-meta">You · just now</div>
    </div>
  `;

  c.appendChild(el);
  c.scrollTop = c.scrollHeight;

}

function addBotMsg(mediaType){
  const c=document.getElementById('chatMessages');
  const ws=document.getElementById('welcomeScreen');
  if(ws) ws.remove();

  const icons={image:'🖼️',audio:'🎙️',video:'🎥',agent:'🤖'};
  const lbls={text:'Text',image:'Image',audio:'Audio',video:'Video',agent:'Agent'};

  const el=document.createElement('div');
  el.className='msg bot';

  el.innerHTML=`<div class="msg-avatar">🔍</div>
    <div class="msg-content">
      ${mediaType!=='text'?`
        <div class="msg-media">
          <span>${icons[mediaType]}</span>
          <span>Analyzing ${lbls[mediaType]}...</span>
        </div>`:''}
      <div class="msg-bubble">
        <em style="color:var(--text3)">Analyzing your content…</em>
      </div>
      <div class="msg-meta">ManipDetect AI · just now</div>
    </div>`;

  c.appendChild(el);
  c.scrollTop=c.scrollHeight;

  return el; // 🔥 RETURN ELEMENT
}

function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatAIResponse(text) {
  if (!text) return "No result from backend";

  // 🔥 Try parsing JSON first
  const json = tryParseJSON(text);

  if (json) {
    return `
      <div class="json-card">

        <div><strong style="color:#43d19e;" >Manipulative:</strong> 
          <span class="${json.manipulative ? 'risk-high' : 'risk-low'}">
            ${json.manipulative ? "YES" : "NO"}
          </span>
        </div>

        <div><strong style="color:#43d19e;" >Technique:</strong> ${json.technique || "N/A"}</div>

        <div><strong style="color:#43d19e;">Explanation:</strong><br>
          ${json.explanation || json.reasoning || "No explanation"}
        </div>

      </div>
    `;
  }

  // ✅ Otherwise treat as Markdown (audio case)

  // Headers
  text = text.replace(/^## (.*$)/gim, '<h2 class="ai-h2">$1</h2>');
  text = text.replace(/^### (.*$)/gim, '<h3 class="ai-h3">$1</h3>');

  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Line breaks
  text = text.replace(/\n/g, "<br>");

  return text;
}

function detectRisk(text) {
  const json = tryParseJSON(text);

  if (json && typeof json.manipulative !== "undefined") {
    return json.manipulative
      ? { label: "HIGH", class: "risk-high" }
      : { label: "LOW", class: "risk-low" };
  }

  const t = text.toLowerCase();

  if (t.includes("high risk")) return {label:"HIGH", class:"risk-high"};
  if (t.includes("medium")) return {label:"MED", class:"risk-med"};
  if (t.includes("low risk")) return {label:"LOW", class:"risk-low"};

  return {label:" ", class:" "};
}


async function sendMessage() {

  const NGROK_ENDPOINTS = {
    text: "https://unrequested-willow-continuatively.ngrok-free.dev/analyze",
    image: "https://unrequested-willow-continuatively.ngrok-free.dev/analyze-image",
    audio: "https://unrequested-willow-continuatively.ngrok-free.dev/analyze-audio",
    video: "https://unrequested-willow-continuatively.ngrok-free.dev/analyze-video",
    agent: "http://127.0.0.1:8000/agent"
  };

  const inputEl = document.getElementById("chatInput");
  const mediaType = document.getElementById("mediaType").value;

  const text = inputEl.value.trim();
  const files = [...uploadedFiles];

  if (!text && files.length === 0) return;

  // ✅ CLEAR INPUT IMMEDIATELY (🔥 FIX)
  inputEl.value = "";
  document.getElementById("filePreviewContainer").innerHTML = "";
  uploadedFiles = [];

  // ✅ Show user message
  if (text) addUserMsg(text, mediaType);
  files.forEach(file => addUserMsg(file, mediaType));

  // ✅ Bot loader
  const botEl = addBotMsg(mediaType);
  const bubble = botEl.querySelector(".msg-bubble");

  try {
    const endpoint = NGROK_ENDPOINTS[mediaType];

    if (!endpoint) {
      bubble.innerHTML = "❌ Invalid media type";
      return;
    }

    let response;

    // 🔤 TEXT
    if (mediaType === "text") {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ texts: [text] ,user_email : currentUser.email, source: "non-extension",website:"offline"})
      });
    }

    // 🤖 AGENT (🔥 FIXED)
    else if (mediaType === "agent") {

      if (!currentUser || !currentUser.email) {
        bubble.innerHTML = "⚠️ Please login to use agent";
        showToast("Please Login to continue");
        return;
      }

      response = await fetch(endpoint, {   // ✅ NO const (important)
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text,
          userid: currentUser.email
        })
      });
    }

    // 📁 FILE
    else {
      if (files.length === 0) {
        bubble.innerHTML = "No file uploaded";
        return;
      }

      const formData = new FormData();
      files.forEach(file => formData.append("file", file));

      formData.append("user_email", currentUser.email);
      formData.append("source", "non-extension");
      formData.append("website", "offline");  

      response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });
    }

    // ❌ HTTP error
    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }

    const data = await response.json();

    // ✅ Extract result
    const finalResult =
      typeof data?.result === "string"
        ? data.result
        : data?.result?.result
        ? data.result.result
        : "No result from backend";

    console.log(finalResult);

    // ✅ Format UI
    const formatted = formatAIResponse(finalResult);
    const risk = detectRisk(finalResult);

    bubble.innerHTML = `
      <div class="ai-result-card">
        <div class="ai-header">
          <span class="ai-title">🧠 Analysis Report</span>
          <span class="risk-badge ${risk.class}">
            ${risk.label}
          </span>
        </div>
        <div class="ai-body">
          ${formatted}
        </div>
      </div>
    `;

    // ✅ Save history
    addRecent(text || "File upload", mediaType, "unknown");

  } catch (err) {
    console.error(err);

    bubble.innerHTML = `
      <span style="color:red;">Failed to connect to backend</span>
    `;
  }
}

// ════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════


let chartsInited=false;
let expandedChart=null;
const expandedCharts={};

function destroyCharts() {
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  charts = {};
}



async function initCharts() {

  destroyCharts();

  const logs = await fetchDashboardData(1000);
  if (!logs.length) return;

  // =========================
  // METRICS
  // =========================
  const total = logs.length;
  const manipulative = logs.filter(l => l.manipulative).length;
  const nonManipulative = total - manipulative;

  document.querySelector("#totalAnalyzed").textContent = total;
  document.querySelector("#manipulationDetected").textContent = manipulative;
  document.querySelector("#highRisk").textContent =
    logs.filter(l => l.technique && l.technique !== "none").length;

  const confidence = Math.round((manipulative / total) * 100) || 0;
  document.querySelector("#avgConfidence").textContent = confidence + "%";


  // =========================
  // 📈 LINE CHART (detections over time)
  // =========================
  const timeMap = {};

  logs.forEach(l => {
    const date = new Date(l.created_at).toLocaleDateString();
    timeMap[date] = (timeMap[date] || 0) + 1;
  });

  const timeLabels = Object.keys(timeMap);
  const timeData = Object.values(timeMap);

  charts.line = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Detections",
        data: timeData,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      events: []
    }
  });


  // =========================
  // 🍩 DOUGHNUT (media type)
  // =========================
  const typeMap = { text:0, image:0, audio:0, video:0 };

  logs.forEach(l => {
    if (typeMap[l.type] !== undefined) {
      typeMap[l.type]++;
    }
  });

  charts.doughnut = new Chart(document.getElementById('doughnutChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(typeMap),
      datasets: [{
        data: Object.values(typeMap)
      }]
    },
    options: {
      events: []
    }

    
  });


  // =========================
  // 📊 BAR (manipulation vs safe)
  // =========================
  charts.bar = new Chart(document.getElementById('barChart'), {
  type: 'bar',
  data: {
    labels: ["Manipulative", "Non-Manipulative"],
    datasets: [{
      label: "Cases",
      data: [manipulative, nonManipulative],
      backgroundColor: [
        "#e84855",  // 🔴 red (manipulative)
        "#43d19e"   // 🟢 green (safe)
      ],
      borderRadius: 8
    }]
  },
  options: {
    events: [],
    plugins: {
      legend: { display: false }
    }
  }
});

const typeManipMap = { text:0, image:0, audio:0, video:0 };

logs.forEach(l => {
  if (l.manipulative && typeManipMap[l.type] !== undefined) {
    typeManipMap[l.type]++;
  }
});

// =========================
// 📊 MANIPULATIVE BY TYPE (FIXED)
// =========================
const labels = ['text', 'image', 'audio', 'video'];

const typeManipMap1 = { text:0, image:0, audio:0, video:0 };

logs.forEach(l => {
  if (l.manipulative && typeManipMap1[l.type] !== undefined) {
    typeManipMap1[l.type]++;
  }
});

// 🎨 consistent colors (same as expanded view)
const colors = {
  text: "#4fc3f7",   // blue
  image: "#ff5c8a",  // pink
  audio: "#ff9f43",  // orange
  video: "#f5c04e"   // yellow
};

charts.radar = new Chart(document.getElementById('radarChart'), {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      label: "Manipulative",
      data: labels.map(l => typeManipMap1[l]), // ✅ FIXED ORDER
      backgroundColor: labels.map(l => colors[l]), // ✅ MATCH COLORS
      borderRadius: 8,
      barThickness: 30
    }]
  },
  options: {
    events: [],
    plugins: {
      legend: { display: false }
    }
  } 
});


  // =========================
  // 🧠 TECHNIQUES (Top tactics)
  // =========================
  renderRealTactics(logs);
}

async function fetchDashboardData(limit = 1000) {
  if (!currentUser || !currentUser.email) return [];

  try {
    const res = await fetch(
      `${API_URL}/get-logs?user_email=${currentUser.email}&limit=${limit}&days=${currentDays}`
    );
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("Dashboard fetch error", err);
    return [];
  }
}


function renderRealTactics(logs) {
  const map = {};

  logs.forEach(l => {
    if (!l.technique || l.technique === "none") return;

    const t = l.technique.replaceAll("_", " ");
    map[t] = (map[t] || 0) + 1;
  });

  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const el = document.getElementById("tacticBars");

 const max = Math.max(...sorted.map(i => i[1]), 1);

  el.innerHTML = sorted.map(([name, count]) => {
    const pct = (count / max) * 100;

    return `
      <div class="tactic-bar-item">
        <div class="tactic-bar-header">
          <span>${name}</span>
          <span>${count}</span>
        </div>
        <div class="tactic-bar-track">
          <div class="tactic-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function collapseChart(){
  expandedChart=null;
  document.getElementById('chartsAll').classList.remove('hidden');
  document.getElementById('chartExpanded').classList.remove('visible');
  document.getElementById('backBtn').classList.remove('visible');
}

updateRecentsBadge();