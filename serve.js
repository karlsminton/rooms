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

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        const json = Buffer.from(msg).toString();
        const data = JSON.parse(json);
        console.log('received message ', data);

        if (data.event == 'connection') {
            // ws.send('hello ' + data.user);

            // wss.clients.forEach((client) => {
                // if (client !== ws && client.readyState === WebSocket.OPEN) {
                // client.send('hello ' + data.user);
                // }
            // })
        } else {
            wss.clients.forEach((client) => {
                // if (client !== ws) {
                //     client.send(data);
                // }
                client.send(json);
            })
        }
    });

    ws.send('response');
});
