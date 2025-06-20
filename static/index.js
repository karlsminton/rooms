let uuid;
let stream;
let ws;

document.addEventListener('DOMContentLoaded', () => {
    uuid = self.crypto.randomUUID();
    // alert('uuid: ' + uuid);

    const btn = document.createElement('button');
    btn.innerText = 'Start Stream';
    btn.addEventListener('click', () => startStream());
    document.querySelector('body').append(btn);

    createWssConnection();
});

const startStream = async () => {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((strm) => {
            stream = strm;
            const vid = addNewVideo(uuid);
            vid.srcObject = stream;
            vid.play();
        }).catch((err) => console.error(err));

    document.querySelector('button').remove();

    const peerConnection = new RTCPeerConnection({});
    
    peerConnection.addEventListener("icecandidateerror", (event) => {
        alert('massive fucking error in icecandidateerror');
        console.error('massive fucking error in icecandidateerror', event);
    });

    peerConnection.addEventListener('track', async (trackEvent) => {
            const remoteStream = trackEvent.streams;
            console.log('remoteStream');
            console.log(remoteStream);
            const video = addNewVideo('blah');
            video.srcObject = remoteStream[0];
        });

    peerConnection.addEventListener('icecandidate', (event) => {
        // alert('ice candidate?');
        console.log('ice candidate?', event);

        if (event.candidate) {
            // @todo - work out intended recipient and include in the sent data
            const iceCandidate = {
                iceCandidate: event.candidate,
                sender: uuid,
            };
            ws.send(JSON.stringify(iceCandidate));
        }
    });

    await navigator.mediaDevices.getUserMedia({ video: true })
        .then((strm) => {
            strm.getTracks().forEach(track => {
                peerConnection.addTrack(track, strm);
            });
        });

    ws.addEventListener('message', async (e) => {
        let data = JSON.parse(e.data);

        // @todo make the client NOT responsible for this
        // if (e.data.destination !== uuid) {
        if (data.sender === uuid) {
            alert('not intended for me!');
            return;
        }

        console.log(data);

        if (data.answer) {
            const remoteDescription = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(remoteDescription);
        }

        if (data.offer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            const answerMsg = {
                answer: answer,
                sender: uuid,
            };
            ws.send(JSON.stringify(answerMsg));
        }

        if (data.iceCandidate) {
            try {
                await peerConnection.addIceCandidate(data.iceCandidate);
                alert('candidate added');
            } catch (e) {
                alert('Error adding received ice candidate: ' + data.iceCandidate);
            }
        }
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const offerMsg = {
        offer: offer,
        sender: uuid,
    };
    ws.send(JSON.stringify(offerMsg));
}

const addNewVideo = (uuid) => {
    const video = document.createElement('video');
    video.id = uuid;
    video.width = 300;
    video.height = 180;
    video.autoplay = true;
    video.muted = true;
    document.querySelector('body').prepend(video);

    return video;
}

const createWssConnection = () => {
    const port = 9998;
    ws = new WebSocket('ws://localhost:' + port);
    
    ws.onopen = (e) => {
        // alert('now open');

        let msg = {
            'event': 'connection',
            'user': uuid,
        }

        ws.send(JSON.stringify(msg));
    }
}