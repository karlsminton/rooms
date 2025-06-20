const express = require('express');
const app = express();
const path = require('path');
const port = 9999;

const { WebSocketServer, WebSocket } = require('ws');

const wss = new WebSocketServer({ port: 9998 })

app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});

app.listen(port, () => {
    console.log(`started server on port ${port}.`);
});

const peerConnectionsIdList = [];

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        const json = Buffer.from(msg).toString();
        const data = JSON.parse(json);
        console.log('received message ', data);

        wss.clients.forEach((client) => {
            client.send(json);
        })
    
    });

    const uuid = crypto.randomUUID();
    const join = {
        init: true, 
        id: uuid, 
        peerConnectionsIdList: peerConnectionsIdList,
    };
    
    ws.send(JSON.stringify(join));
    peerConnectionsIdList.push(uuid);
    ws.id = uuid;

    // console.log(ws);
});

// wss.on('close', (ws) => {
// 
//     console.log('deleted idx ' + ws.id);
//     const idx = peerConnectionsIdList.findIndex(ws.id);
//     delete peerConnectionsIdList[idx];
//     console.log(peerConnectionsIdList);
// });
