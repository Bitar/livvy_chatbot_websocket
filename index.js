import {WebSocketServer} from 'ws';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';

dotenv.config({path: '.env'});

const privateKey = fs.readFileSync(process.env.DOMAIN_PRIVATE_KEY);
const certificate = fs.readFileSync(process.env.DOMAIN_CERTIFICATE);

const credentials = {
    key: privateKey,
    cert: certificate
};

const API_URL = process.env.OPENAI_API_URL
const PORT = process.env.SERVICE_PORT;

const httpsServer = https.createServer(credentials);
httpsServer.listen(PORT);

const wss = new WebSocketServer({server: httpsServer});

const createThread = async () => {
    return fetch(`${API_URL}/threads/create`)
        .then((response) => {
            return response.json().then((res) => {
                const message = res.message;
                const threadId = res.thread_id;

                return {message, threadId}
            }).catch((err) => {
                console.log(err);
            })
        });
}

const sendMessage = async (threadId, payload) => {
    return fetch(`${API_URL}/threads/${threadId}/messages/create`, {
        method: "POST",
        body: JSON.stringify({
            message: payload
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then((response) => {
        return response.json().then((res) => {
            const message = res.message;
            const threadId = res.thread_id;

            return {message, threadId}
        }).catch((err) => {
            console.log(err);
        })
    });
}

wss.on('listening', () => console.log(`WebSocket server is running on port ${PORT}`));

wss.on('connection', function connection(ws) {
    ws.on('message', async function message(data) {
        try {
            const message = JSON.parse(data);

            if ('type' in message) {
                console.log(message);

                if (message['type'] === 'init') {
                    // do API call to create a new thread
                    const result = await createThread();

                    ws.send(JSON.stringify({
                        message: result.message,
                        threadId: result.threadId
                    }));
                } else if (message['type'] === 'message') {
                    // we need to send a message to python open ai
                    const threadId = message['threadId'];
                    const payload = message['message'];

                    const result = await sendMessage(threadId, payload);

                    ws.send(JSON.stringify({
                        message: result.message,
                        threadId: result.threadId
                    }));
                }
            } else {
                console.error('Required parameter `type` is missing from message');
            }

        } catch (e) {
            console.error(e);
        }
    });

    ws.on('close', function message(data) {
        console.log('closed at: ' + new Date().toISOString());
    })
});