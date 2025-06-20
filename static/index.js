let uuid;
let stream;
let ws;
let peerConnectionsIdList = [];
const peerConnectionsList = {};

document.addEventListener('DOMContentLoaded', () => {
    // uuid = self.crypto.randomUUID();
    createWssConnection();
    const btn = document.createElement('button');
    btn.innerText = 'Start Stream';
    btn.addEventListener('click', () => startStream());
    document.querySelector('body').append(btn);
});

// window.addEventListener('beforeunload', (e) => {
//     e.preventDefault();
//     ws.close();
//     return true;
// });

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

    ws.addEventListener('message', async (e) => {
        let data = JSON.parse(e.data);

        // @todo make the client NOT responsible for this
        // if (e.data.destination !== uuid) {
        if (data.sender === uuid) {
            console.log('not intended for me!');
            return;
        }

        console.log(data);

        if (data.answer) {
            //@todo lose this inner if
            if (data.recipient === uuid) {
                const remoteDescription = new RTCSessionDescription(data.answer);
                // await peerConnection.setRemoteDescription(remoteDescription);
                await peerConnectionsList[data.sender].setRemoteDescription(remoteDescription);
            }
        }

        if (data.offer) {
            // @todo lose this inner if 
            if (data.recipient === uuid) {
                const sender = data.sender;

                if (!peerConnectionsList[sender]) {
                    peerConnectionsList[sender] = await createPeerConnection(sender);
                }

                peerConnectionsList[data.sender].setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnectionsList[data.sender].createAnswer();
                await peerConnectionsList[data.sender].setLocalDescription(answer);

                const answerMsg = {
                    recipient: data.sender,
                    answer: answer,
                    sender: uuid,
                };

                ws.send(JSON.stringify(answerMsg));
            }
        }

        if (data.iceCandidate) {
            try {
                // @todo work out how to ensure the recipient is correct
                // await peerConnection.addIceCandidate(data.iceCandidate);
                peerConnectionsList[data.sender].addIceCandidate(data.iceCandidate);
                alert('candidate added');
            } catch (e) {
                alert('Error adding received ice candidate: ' + data.iceCandidate);
            }
        }
    });

    // const offer = await peerConnection.createOffer();
    // await peerConnection.setLocalDescription(offer);

    // const offerMsg = {
    //     offer: offer,
    //     sender: uuid,
    // };
    // ws.send(JSON.stringify(offerMsg));

    while (id = peerConnectionsIdList.pop()) {
        if (undefined === id) {
            return;
        }

        const connection = await createPeerConnection(id);

        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        peerConnectionsList[id] = connection;

        const offerMsg = {
            recipient: id,
            offer: offer,
            sender: uuid,
        };

        ws.send(JSON.stringify(offerMsg));
    }
}

const addNewVideo = (uuid) => {
    const video = document.createElement('video');
    video.id = uuid;
    video.width = 300;
    video.height = 180;
    video.autoplay = true;
    video.muted = true;

    // video.srcObject.onsourceended = handleStreamCloseOrFail
    // video.srcObject.onsourceclose = handleStreamCloseOrFail
    // video.srcObject.onremovetrack = handleStreamCloseOrFail

    document.querySelector('body').prepend(video);

    return video;
}

const handleStreamCloseOrFail = (e) => {
    const id = e.currentTarget.getAttribute('id');
    alert('closing ' + id);
    document.getElementById(id).remove();
};

const createWssConnection = () => {
    const port = 9998;
    ws = new WebSocket('ws://localhost:' + port);

    ws.addEventListener('message', (e) => {
        // alert('msg');
        console.log(e.data);

        const data = JSON.parse(e.data);

        if (data.init) {
            uuid = data.id;
            peerConnectionsIdList = data.peerConnectionsIdList;
            let msg = { join: true, sender: uuid };
            ws.send(JSON.stringify(msg));
        }

        if (data.join === true && data.sender !== uuid) {
            alert('join');
            console.log(e.data);
            peerConnectionsIdList.push(data.sender);
        }
    });
}

const trackPeer = async (e, id) => {
    const remoteStream = e.streams;
    console.log('remoteStream');
    console.log(remoteStream);
    const video = addNewVideo(id);
    video.srcObject = remoteStream[0];

    video.srcObject.onsourceended = handleStreamCloseOrFail
    video.srcObject.onsourceclose = handleStreamCloseOrFail
    video.srcObject.onremovetrack = handleStreamCloseOrFail
}

const iceCandidate = (e) => {
    // alert('ice candidate?');
    console.log('ice candidate?', e);

    if (e.candidate) {
        // @todo - work out intended recipient and include in the sent data
        const iceCandidate = {
            iceCandidate: e.candidate,
            sender: uuid,
        };
        ws.send(JSON.stringify(iceCandidate));
    }
};

const createPeerConnection = async (id) => {
    const connection = new RTCPeerConnection({});

    connection.addEventListener('track', (e) => {
        trackPeer(e, id);
    });
    connection.addEventListener('icecandidate', iceCandidate);

    connection.addEventListener("icecandidateerror", (event) => {
        alert('massive fucking error in icecandidateerror');
        console.error('massive fucking error in icecandidateerror', event);
    });

    connection.onsourceended = (e) => {
        alert('dun fucked up');
    }

    // delete video element if disconnected
    connection.onconnectionstatechange = (e) => {
        if (e.currentTarget.iceConnectionState === 'disconnected') {
            const key = Object.keys(peerConnectionsList).find((key) => {
                return peerConnectionsList[key] === e.currentTarget;
            });
            document.getElementById(key).remove();
        }
    }

    await navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        stream.getTracks().forEach(track => {
            connection.addTrack(track, stream);
        });
    });

    return connection;
}

