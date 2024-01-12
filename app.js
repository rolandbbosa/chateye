const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const constraints = { video: true, audio: true };
const socket = new WebSocket('ws://localhost:3000');

let localStream;
let remoteStream;
let localPeerConnection;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const skipBtn = document.getElementById('skipBtn');

startBtn.addEventListener('click', startChat);
stopBtn.addEventListener('click', stopChat);
skipBtn.addEventListener('click', skipChat);

socket.addEventListener('message', handleSignalingData);

async function startChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;

        localPeerConnection = new RTCPeerConnection(configuration);
        localPeerConnection.addStream(localStream);

        localPeerConnection.onicecandidate = handleICECandidateEvent;
        localPeerConnection.onaddstream = handleRemoteStreamAdded;

        const offer = await localPeerConnection.createOffer();
        await localPeerConnection.setLocalDescription(offer);

        // Send the offer to the WebSocket server
        socket.send(JSON.stringify({ offer }));
    } catch (error) {
        console.error('Error starting chat:', error);
    }
}

function stopChat() {
    if (localPeerConnection) {
        localPeerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}

function skipChat() {
    stopChat();
    startChat();
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        // Send the ICE candidate to the WebSocket server
        socket.send(JSON.stringify({ iceCandidate: event.candidate }));
    }
}

function handleRemoteStreamAdded(event) {
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleSignalingData(data) {
    const parsedData = JSON.parse(data.data);

    if (parsedData.offer) {
        handleOffer(parsedData.offer);
    } else if (parsedData.iceCandidate) {
        handleICECandidate(parsedData.iceCandidate);
    }
}

async function handleOffer(offer) {
    try {
        await localPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await localPeerConnection.createAnswer();
        await localPeerConnection.setLocalDescription(answer);

        // Send the answer to the WebSocket server
        socket.send(JSON.stringify({ answer }));
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

async function handleICECandidate(candidate) {
    try {
        await localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
}
