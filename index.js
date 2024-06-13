import {WebSocketServer} from 'ws';

const wss = new WebSocketServer({port: 9010});

const createThread = async () => {
    return fetch("https://openai.livvy.digitalpandas.io/threads/create")
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
    return fetch(`https://openai.livvy.digitalpandas.io/threads/${threadId}/messages/create`, {
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

wss.on('connection', function connection(ws) {
    console.log('Connected on port 9010')

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