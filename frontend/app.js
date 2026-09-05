function bootApp() {
    const path = window.location.pathname;
    
    if (path.includes("measure")) {
        initMeasure();
    } else if (path.includes("record")) {
        initRecord();
    } else {
        initHome();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp);
} else {
    bootApp();
}

// =====================================
// 1. HOME PAGE LOGIC & PROFILE
// =====================================
async function initHome() {
    initChat(); 
    
    // Check if the profile exists, trigger popup if empty
    try {
        const profRes = await fetch("/api/profile");
        const profData = await profRes.json();
        if (!profData.exists) {
            const modal = document.getElementById('onboardingModal');
            if(modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        }
    } catch(e) { console.error("Profile check failed"); }

    try {
        const res = await fetch("/api/history");
        const history = await res.json();
        if(history.length > 0) {
            const latest = history[history.length - 1]; 
            
            document.getElementById("hero-power").innerText = latest.max_power_w.toLocaleString();
            document.getElementById("card-power").innerText = latest.max_power_w.toLocaleString() + " W";
            document.getElementById("hero-jump").innerText = latest.height_cm;
            document.getElementById("card-jump").innerText = latest.height_cm + " cm";
            document.getElementById("hero-force").innerText = latest.max_force_n.toLocaleString();
            document.getElementById("card-force").innerText = latest.max_force_n.toLocaleString() + " N";
            document.getElementById("card-rsi").innerText = latest.rsi;
            document.getElementById("card-eur").innerText = latest.eur;
            
            document.getElementById("card-score").innerText = latest.score;
            document.getElementById("card-ptm").innerText = latest.power_to_mass + " W/kg";
            document.getElementById("card-ssc").innerText = latest.ssc_efficiency_pct + "%";
            document.getElementById("card-sym").innerText = latest.landing_symmetry_pct + "%";

            renderForceVelocityVisual(latest.max_force_n);
        }
    } catch(err) { console.error("Could not load home history", err); }
}

async function submitProfile(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('profName').value,
        age: parseInt(document.getElementById('profAge').value),
        weight_kg: parseFloat(document.getElementById('profWeight').value),
        height_cm: parseFloat(document.getElementById('profHeight').value)
    };
    
    await fetch("/api/profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    
    const modal = document.getElementById('onboardingModal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function renderForceVelocityVisual(peakForce) {
    const ctx = document.getElementById('forceVelocityChart');
    if(!ctx) return;
    
    const labels = ['Bodyweight', 'Unweighting', 'Braking', 'Propulsive', 'Flight', 'Landing Impact', 'Stabilize'];
    const bodyWeightForce = 750; 
    
    const forceData = [bodyWeightForce, 200, bodyWeightForce, peakForce, 0, peakForce * 1.5, bodyWeightForce];
    const velocityData = [0, -1.5, -2, 2.8, -3.5, 0, 0];

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [
                { label: 'Vertical Force (N)', data: forceData, borderColor: '#2563eb', backgroundColor: 'transparent', yAxisID: 'yForce', tension: 0.4, borderWidth: 3, pointRadius: 4, pointHoverRadius: 8, pointBackgroundColor: '#2563eb' },
                { label: 'Velocity (m/s)', data: velocityData, borderColor: '#f97316', backgroundColor: 'transparent', yAxisID: 'yVel', tension: 0.4, borderWidth: 3, pointRadius: 4, pointHoverRadius: 8, pointBackgroundColor: '#f97316' }
            ] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { x: { grid: { display: false } }, yForce: { type: 'linear', position: 'left', min: -1000 }, yVel: { type: 'linear', position: 'right', min: -4, max: 8, grid: { drawOnChartArea: false } } },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 13 }, bodyFont: { size: 13 }, padding: 12, cornerRadius: 8 } }
        }
    });
}

// --- AI Chat Logic ---
async function initChat() {
    try {
        const res = await fetch("/api/chat/start");
        const data = await res.json();
        appendMsg("AI Coach", data.reply, true);
    } catch (e) { appendMsg("AI Coach", "Hey athlete! Welcome to ElevateAI. Let's get tracking.", true); }
}

async function sendChat() {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (!msg) return;
    
    appendMsg("You", msg, false);
    input.value = "";
    
    try {
        const res = await fetch("/api/chat/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
        const data = await res.json();
        appendMsg("AI Coach", data.reply, true);
    } catch (e) { appendMsg("AI Coach", "I'm offline right now, but your metrics are safe!", true); }
}

function appendMsg(sender, text, isAI) {
    const b = document.getElementById("chatBox");
    const bgColor = isAI ? "bg-slate-100 text-slate-800" : "bg-indigo-600 text-white";
    const align = isAI ? "self-start" : "self-end text-right";
    const name = isAI ? `<span class="text-xs font-bold text-slate-500 mb-1">${sender}</span>` : '';
    
    if (b) {
        b.innerHTML += `<div class="flex flex-col ${align} max-w-[85%]">${name}<div class="px-4 py-2.5 rounded-2xl ${bgColor} leading-relaxed shadow-sm">${text}</div></div>`;
        b.scrollTop = b.scrollHeight;
    }
}

document.getElementById('chatInput')?.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendChat(); });


// =====================================
// 2. RECORD PAGE LOGIC
// =====================================
let recordHistoryData = [];
let trendChartInstance = null;

async function initRecord() {
    try {
        const res = await fetch("/api/history");
        recordHistoryData = await res.json();
        
        if (recordHistoryData.length > 0) {
            const latest = recordHistoryData[recordHistoryData.length - 1]; 
            const heights = recordHistoryData.map(h => h.height_cm);
            const pr = Math.max(...heights);
            
            document.getElementById("rec-pr").innerText = pr.toFixed(2);
            document.getElementById("rec-power").innerText = latest.max_power_w.toLocaleString();
            document.getElementById("rec-force").innerText = latest.max_force_n.toLocaleString();
            document.getElementById("rec-score").innerText = latest.score;
            
            renderTrendChart('height_cm', 'Jump Height (cm)');
        }

        const tbody = document.getElementById("record-table-body");
        if (!tbody) return;
        
        tbody.innerHTML = ""; 
        [...recordHistoryData].reverse().forEach((entry) => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-brand-50/40 transition";
            tr.innerHTML = `
                <td class="py-3 px-3 font-medium text-slate-900">${entry.timestamp || 'Just now'}</td>
                <td class="py-3 px-3"><span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium text-xs">CMJ Tracked</span></td>
                <td class="py-3 px-3 font-extrabold text-slate-900">${entry.height_cm} cm</td>
                <td class="py-3 px-3 font-mono font-medium">${entry.rsi}</td>
                <td class="py-3 px-3 font-mono">${entry.max_power_w} W</td>
                <td class="py-3 px-3 font-mono">${entry.max_force_n} N</td>
                <td class="py-3 px-3 font-mono">${entry.eur}</td>
                <td class="py-3 px-3"><span class="font-bold text-emerald-600">${entry.score}</span><span class="text-slate-400 text-xs">/100</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) { console.error("Could not load record history", err); }
}

window.switchTab = function(metricKey, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = "tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition";
    });
    btnElement.className = "tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-900 shadow-sm transition";
    
    const labels = { 'height_cm': 'Jump Height (cm)', 'rsi': 'RSI Index', 'max_power_w': 'Peak Power (W)', 'max_force_n': 'Peak Force (N)', 'eur': 'EUR Ratio', 'score': 'Neuromuscular Score' };
    renderTrendChart(metricKey, labels[metricKey]);
}

function renderTrendChart(metricKey, titleLabel) {
    const ctx = document.getElementById('trend-chart');
    if(!ctx || recordHistoryData.length === 0) return;
    if (trendChartInstance) trendChartInstance.destroy(); 
    
    const labels = recordHistoryData.map((h, i) => h.timestamp ? h.timestamp.split(" ")[0].slice(5) : `Jump ${i+1}`);
    const values = recordHistoryData.map(h => h[metricKey]);
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(107, 118, 226, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    trendChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{ label: titleLabel, data: values, borderColor: '#5358d3', backgroundColor: gradient, fill: true, tension: 0.4, borderWidth: 2, pointBackgroundColor: '#313379', pointRadius: 4, pointHoverRadius: 7 }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { border: { dash: [4, 4] } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, cornerRadius: 8 } } }
    });
}

// =====================================
// 3. MEASURE PAGE LOGIC
// =====================================
let streamInstance = null, poseModel = null, cameraUtils = null;
let isRecording = false, recordStartTime = 0;
let recordingData = { hip: [], l_ankle: [], r_ankle: [], times: [] };

async function initMeasure() {
    const video = document.getElementById("webcam");
    const btn = document.getElementById("recordBtn");
    
    if(btn) {
        console.log("Record button attached");
        btn.onclick = startCountdownAndRecord;
    }

    try {
        streamInstance = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        video.srcObject = streamInstance;
        
        poseModel = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
        poseModel.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        poseModel.onResults(onPoseResults);
        
        cameraUtils = new Camera(video, { onFrame: async () => { await poseModel.send({image: video}); }, width: 640, height: 480 });
        cameraUtils.start();
    } catch(err) { console.warn("Webcam error:", err); }
}

function onPoseResults(results) {
    const canvas = document.getElementById("webcamCanvas");
    const ctx = canvas.getContext("2d");
    const video = document.getElementById("webcam");
    if(!canvas || !ctx) return;

    canvas.width = video.videoWidth; 
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#ffffff', lineWidth: 4});
        drawLandmarks(ctx, results.poseLandmarks, {color: '#10b981', lineWidth: 2, radius: 3});
        
        if (isRecording) {
            let lm = results.poseLandmarks;
            recordingData.hip.push((lm[23].y + lm[24].y) / 2.0);
            recordingData.l_ankle.push(lm[27].y);
            recordingData.r_ankle.push(lm[28].y);
            recordingData.times.push((Date.now() - recordStartTime) / 1000.0);
        }
    }
}

function startCountdownAndRecord() {
    const overlay = document.getElementById("countdownOverlay");
    const btn = document.getElementById("recordBtn");
    if (btn) btn.disabled = true;

    let count = 3;
    overlay.classList.remove("hidden");
    overlay.style.display = "flex";
    overlay.innerText = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) { 
            overlay.innerText = count; 
        } else if (count === 0) {
            overlay.innerText = "JUMP!";
            clearInterval(timer);
            isRecording = true;
            recordingData = { hip: [], l_ankle: [], r_ankle: [], times: [] };
            recordStartTime = Date.now();
            setTimeout(() => finishRecording(overlay, btn), 4500); 
        }
    }, 1000);
}

async function finishRecording(overlay, btn) {
    isRecording = false;
    overlay.innerText = "Running Physics Math...";
    
    // Weight is no longer collected from HTML - Backend handles it!
    const payload = {
        hip_y: recordingData.hip, 
        l_ankle_y: recordingData.l_ankle, 
        r_ankle_y: recordingData.r_ankle, 
        times: recordingData.times
    };

    try {
        await fetch("/api/analyze_data", { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload) 
        });
        if(streamInstance) streamInstance.getTracks().forEach(track => track.stop());
        window.location.href = "/index.html"; 
    } catch(e) { 
        alert("Server Analysis failed. Ensure backend is running."); 
        overlay.classList.add("hidden");
        overlay.style.display = "none";
        if(btn) btn.disabled = false;
    }
}