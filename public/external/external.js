const ws = new WebSocket("ws://localhost:8000/ws");
const captions = document.getElementById("captions");
const summaryBox = document.getElementById("summary");

document.getElementById("fontSize").onchange = (e) => {
  captions.style.fontSize = e.target.value;
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
  const data = JSON.parse(event.data);

  if (data.type === "TRANSCRIPT") {
    captions.innerText += " " + data.text;
  }

  if (data.type === "SUMMARY_RESULT") {
    summaryBox.innerText = data.summary;
  }
};

let currentRecorder = null;
let currentStream = null;
let audioChunks = [];
let isRecordingActive = false;

document.getElementById("startBtn").onclick = async () => {
  document.getElementById("stopBtn").style.display = "inline";
  document.getElementById("startBtn").style.display = "none";
  try {
    // Stop previous recording if exists
    if (currentRecorder && currentRecorder.state !== 'inactive') {
      currentRecorder.stop();
    }
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentRecorder = new MediaRecorder(currentStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    audioChunks = [];
    isRecordingActive = true;
    
    currentRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };
    
    currentRecorder.onstop = () => {
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        ws.send(audioBlob);
        console.log(`Sent complete audio: ${audioBlob.size} bytes`);
        audioChunks = [];
      }
      
      // Restart recording if still active
      if (isRecordingActive && currentStream && currentStream.active) {
        setTimeout(() => {
          if (isRecordingActive && currentRecorder && currentStream.active) {
            currentRecorder.start();
            scheduleStop();
          }
        }, 100);
      }
    };

    function scheduleStop() {
      setTimeout(() => {
        if (currentRecorder && currentRecorder.state === 'recording' && isRecordingActive) {
          currentRecorder.stop();
        }
      }, 3000);
    }

    // Start initial recording
    currentRecorder.start();
    scheduleStop();
    
    console.log('Recording started');
    
  } catch (err) {
    isRecordingActive = false;
    if (err.name === 'NotAllowedError') {
      console.log('Permission denied - user denied microphone access');
      alert('Please allow microphone access to use this feature');
    } else if (err.name === 'NotFoundError') {
      console.log('No microphone found');
      alert('No microphone device found');
    } else {
      console.log('Error accessing microphone:', err.message);
      alert('Error accessing microphone: ' + err.message);
    }
  }
};

document.getElementById("summaryBtn").onclick = () => {
  ws.send(JSON.stringify({ type: "SUMMARY_REQUEST" }));
  document.getElementsByClassName('summary')[0].style.display = "block";
};

document.getElementById("stopBtn").addEventListener("click", () => {
  document.getElementById("stopBtn").style.display = "none";
  document.getElementById("startBtn").style.display = "inline";
  isRecordingActive = false;
  if (currentRecorder && currentRecorder.state !== 'inactive') {
    currentRecorder.stop();
  }
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  console.log('Recording stopped');
});
