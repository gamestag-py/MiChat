<<<<<<< HEAD
/**
 * Generic WebSocket server with MySQL
 *
 * Install:
 *   npm install express ws mysql2 dotenv
 *
 * .env:
 *   PORT=8000
 *   DB_HOST=127.0.0.1
 *   DB_PORT=3306
 *   DB_USER=root
 *   DB_PASSWORD=your_password
 *   DB_NAME=michat
 *
 * Run:
 *   node server.js
 *
 * WebSocket URL:
 *   ws://5.189.157.103:8000
 *
 * Demo message types:
 *   { "type": "ping" }
 *   { "type": "echo", "data": { "hello": "world" } }
 *   { "type": "join", "room": "general", "username": "alice" }
 *   { "type": "leave" }
 *   { "type": "broadcast", "message": "Hello everyone" }
 *   { "type": "private", "to": "bob", "message": "Hello Bob" }
 *   { "type": "chat", "message": "Hello room" }
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
    noServer: true,
    maxPayload: 1024 * 1024
});


server.on('upgrade', async (request, socket, head) => {

    try {
        const cookie = request.headers.cookie;

        if (!cookie) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Validate the PHP session using the existing cookie.
        const response = await fetch(
            process.env.PHP_SESSION_VERIFY_URL,
            {
                method: 'GET',
                headers: {
                    Cookie: cookie,
                    Accept: 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            }
        );

        if (!response.ok) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const auth = await response.json();

        if (
            !auth.success ||
            !Number.isSafeInteger(auth.user_id) ||
            auth.user_id <= 0
        ) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Authentication successful.
        wss.handleUpgrade(request, socket, head, (ws) => {

            // Trusted ID obtained from PHP session.
            ws.userId = auth.user_id;

            wss.emit('connection', ws, request);
        });

    } catch (error) {

        console.error('WebSocket authentication failed:', error.message);

        if (!socket.destroyed) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    }
});


const PORT = Number(process.env.PORT || 8000);

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Active connections and room membership
const clients = new Map();       // WebSocket -> client information
const rooms = new Map();         // room name -> Set<WebSocket>

// Basic HTTP health endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'WebSocket server',
        websocket: `"ws://5.189.157.103:${PORT}`,
        connectedClients: clients.size,
        rooms: rooms.size
    });
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ success: true, websocket: 'running', mysql: 'connected' });
    } catch (error) {
        res.status(503).json({
            success: false,
            websocket: 'running',
            mysql: 'disconnected'
        });
    }
});

function send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function sendError(ws, message, code = 'BAD_REQUEST') {
    send(ws, {
        type: 'error',
        code,
        message
    });
}

function sendToRoom(roomName, payload, except = null) {
    const members = rooms.get(roomName);
    if (!members) return;

    for (const client of members) {
        if (client !== except) {
            send(client, payload);
        }
    }
}

function removeFromRoom(ws) {
    const client = clients.get(ws);
    if (!client || !client.room) return;

    const roomName = client.room;
    const members = rooms.get(roomName);

    if (members) {
        members.delete(ws);

        if (members.size === 0) {
            rooms.delete(roomName);
        }
    }

    client.room = null;

    sendToRoom(roomName, {
        type: 'user_left',
        username: client.username,
        room: roomName
    });
}


/**
 * Save an encrypted direct message using the same columns as the PHP endpoint.
 *
 * incoming_id = recipient's users.unique_id
 * sender_id   = authenticated sender's users.unique_id
 */
async function saveMessage({
    incoming_id,
    sender_id,
    encrypted_msg,
    encrypted_key_sender,
    encrypted_key_recipient,
    iv,
    disappear_after_seconds
}) {
    const recipientId = Number(incoming_id);
    const senderId = Number(sender_id);

    if (
        !Number.isSafeInteger(recipientId) || recipientId <= 0 ||
        !Number.isSafeInteger(senderId) || senderId <= 0 ||
        typeof encrypted_msg !== 'string' || !encrypted_msg ||
        typeof encrypted_key_sender !== 'string' || !encrypted_key_sender ||
        typeof encrypted_key_recipient !== 'string' || !encrypted_key_recipient ||
        typeof iv !== 'string' || !iv
    ) {
        const error = new Error('Missing or invalid encrypted message data');
        error.code = 'INVALID_MESSAGE';
        throw error;
    }

    if (recipientId === senderId) {
        const error = new Error('You cannot send a message to yourself');
        error.code = 'INVALID_RECIPIENT';
        throw error;
    }

    // Verify recipient exists.
    const [users] = await db.execute(
        'SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1',
        [recipientId]
    );

    if (users.length === 0) {
        const error = new Error('Recipient not found');
        error.code = 'RECIPIENT_NOT_FOUND';
        throw error;
    }

    // Match the PHP rule: reject if recipient has blocked sender.
    const [blocks] = await db.execute(
        `SELECT id
         FROM user_blocks
         WHERE blocker_id = ?
           AND blocked_id = ?
         LIMIT 1`,
        [recipientId, senderId]
    );

    if (blocks.length > 0) {
        const error = new Error('You cannot send messages to this user.');
        error.code = 'USER_BLOCKED';
        throw error;
    }

    // Store the encrypted payload in the existing MiChat messages table.
    const [result] = await db.execute(
        `INSERT INTO messages
            (
                incoming_msg_id,
                outgoing_msg_id,
                encrypted_msg,
                encrypted_key_sender,
                encrypted_key_recipient,
                iv,
                disappear_after_seconds
            )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            recipientId,
            senderId,
            encrypted_msg,
            encrypted_key_sender,
            encrypted_key_recipient,
            iv,
            disappear_after_seconds
        ]
    );

    return result.insertId;
}



async function updateMessageStatus({
    message_id,
    status
}) {
    const messageId = Number(message_id);

    if (
        !Number.isSafeInteger(messageId) || messageId <= 0 ||
        !['delivered', 'seen'].includes(status)
    ) {
        const error = new Error('Invalid message status data');
        error.code = 'INVALID_STATUS';
        throw error;
    }

    const [result] = await db.execute(
        status === 'seen'
            ? `UPDATE messages
               SET delivered_at = COALESCE(delivered_at, NOW()),
                   seen_at = COALESCE(seen_at, NOW()),
                   expires_at = CASE
                       WHEN disappear_after_seconds > 0
                       THEN COALESCE(
                           expires_at,
                           DATE_ADD(NOW(), INTERVAL disappear_after_seconds SECOND)
                       )
                       ELSE expires_at
                   END
               WHERE msg_id = ?`
            : `UPDATE messages
               SET delivered_at = COALESCE(delivered_at, NOW())
               WHERE msg_id = ?`,
        [messageId]
    );

    return result.affectedRows > 0;
}


async function getMessageById(messageId) {
    const [rows] = await db.execute(
        `SELECT
            m.msg_id,
            m.incoming_msg_id,
            m.outgoing_msg_id,
            m.encrypted_msg,
            m.encrypted_key_sender,
            m.encrypted_key_recipient,
            m.iv,
            u.img
         FROM messages m
         JOIN users u ON u.unique_id = m.outgoing_msg_id
         WHERE m.msg_id = ?
         LIMIT 1`,
        [messageId]
    );

    return rows[0] || null;
}

async function markPendingMessagesDelivered(userId) {
    const connection = await db.getConnection();
    let pendingMessages = [];

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT msg_id, outgoing_msg_id
             FROM messages
             WHERE incoming_msg_id = ?
               AND delivered_at IS NULL
               AND (expires_at IS NULL OR expires_at > NOW())
             FOR UPDATE`,
            [userId]
        );

        pendingMessages = rows;

        if (pendingMessages.length > 0) {
            await connection.execute(
                `UPDATE messages
                 SET delivered_at = COALESCE(delivered_at, NOW())
                 WHERE incoming_msg_id = ?
                   AND delivered_at IS NULL`,
                [userId]
            );
        }

        await connection.commit();

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }

    // Notify the original senders
    for (const msg of pendingMessages) {
        for (const [clientWs, connectedClient] of clients.entries()) {
            if (
                Number(connectedClient.userId) === Number(msg.outgoing_msg_id)
            ) {
                send(clientWs, {
                    type: 'message_delivered',
                    message: msg.msg_id,
                    receiver: userId
                });
            }
        }
    }
}


async function markConversationSeen(userId, withId) {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Get all unseen messages received from this user.
        const [messages] = await connection.execute(
            `SELECT msg_id, outgoing_msg_id
             FROM messages
             WHERE incoming_msg_id = ?
               AND outgoing_msg_id = ?
               AND seen_at IS NULL
               AND (expires_at IS NULL OR expires_at > NOW())
             FOR UPDATE`,
            [userId, withId]
        );

        if (messages.length > 0) {
            await connection.execute(
                `UPDATE messages
                 SET
                    delivered_at = COALESCE(delivered_at, NOW()),
                    seen_at = COALESCE(seen_at, NOW()),
                    expires_at = CASE
                        WHEN disappear_after_seconds > 0
                        THEN COALESCE(
                            expires_at,
                            DATE_ADD(
                                NOW(),
                                INTERVAL disappear_after_seconds SECOND
                            )
                        )
                        ELSE expires_at
                    END
                 WHERE incoming_msg_id = ?
                   AND outgoing_msg_id = ?
                   AND seen_at IS NULL
                   AND (expires_at IS NULL OR expires_at > NOW())`,
                [userId, withId]
            );
        }

        await connection.commit();

        return messages;

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}


async function handleMessage(ws, rawData) {
    let msg;

    try {
        msg = JSON.parse(rawData.toString());
    } catch {
        return sendError(ws, 'Message must be valid JSON', 'INVALID_JSON');
    }
    console.log(msg)
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
        return sendError(ws, 'Message must be a JSON object');
    }

    const client = clients.get(ws);
    if (!client) return;
    const currentId = Number(client.userId);

    switch (msg.type) {
        // Connection test: client sends ping, server responds with pong.
        case 'ping':
            return send(ws, {
                type: 'pong',
                timestamp: Date.now()
            });

        // Echo test: server returns the supplied data.
        case 'echo':
            return send(ws, {
                type: 'echo_response',
                data: msg.data ?? null,
                timestamp: Date.now()
            });

        // Set/update the client's display name.
        case 'identify': {
            const username = String(msg.username || '').trim();

            if (!username || username.length > 50) {
                return sendError(ws, 'A username of 1-50 characters is required');
            }

            client.username = username;

            return send(ws, {
                type: 'identified',
                clientId: client.id,
                username
            });
        }

        // Join a room. A client can be in one room at a time.
        case 'join': {
            const roomName = String(msg.room || '').trim();

            if (!roomName || roomName.length > 100) {
                return sendError(ws, 'A room name of 1-100 characters is required');
            }

            removeFromRoom(ws);

            if (!rooms.has(roomName)) {
                rooms.set(roomName, new Set());
            }

            rooms.get(roomName).add(ws);
            client.room = roomName;

            send(ws, {
                type: 'joined',
                room: roomName,
                username: client.username
            });

            sendToRoom(roomName, {
                type: 'user_joined',
                room: roomName,
                username: client.username
            }, ws);

            return send(ws, {
                type: 'room_info',
                room: roomName,
                members: [...rooms.get(roomName)].map(socket => ({
                    clientId: clients.get(socket)?.id,
                    username: clients.get(socket)?.username
                }))
            });
        }


        case 'chat': {
            if (!Number.isSafeInteger(Number(client.userId)) || Number(client.userId) <= 0) {
                return send(ws, {
                    type: 'message_error',
                    success: false,
                    code: 'NOT_AUTHENTICATED',
                    message: 'Authenticate your WebSocket connection before sending messages'
                });
            }

            try {
                const senderId = Number(client.userId);
                const recipientId = Number(msg.incoming_id);

                const messageId = await saveMessage({
                    incoming_id: recipientId,
                    sender_id: senderId,
                    encrypted_msg: msg.encrypted_msg,
                    encrypted_key_sender: msg.encrypted_key_sender,
                    encrypted_key_recipient: msg.encrypted_key_recipient,
                    iv: msg.iv,
                    disappear_after_seconds: msg.disappear_after_seconds
                });

                // Fetch the saved message, including the sender's profile image.
                const savedMessage = await getMessageById(messageId);

                // Acknowledge the sender.
                console.log("Message saved:", messageId);
                console.log("Socket state:", ws.readyState);
                console.log("Request ID:", msg.request_id);

                const response = {
                    type: 'message_sent',
                    success: true,
                    msg_id: messageId,
                    incoming_id: recipientId,
                    request_id: msg.request_id
                };

                const sent = send(ws, response);

                console.log("Acknowledgement sent:", sent);
                // Notify recipient and sender's other active connections.
                const notification = {
                    type: 'new_message',
                    message: savedMessage
                };

                for (const [clientWs, connectedClient] of clients.entries()) {
                    if (
                        connectedClient.userId === recipientId
                    ) {
                        if (clientWs.readyState === WebSocket.OPEN) {
                            send(clientWs, notification);
                        }
                    }
                }

            } catch (error) {
                const status = {
                    USER_BLOCKED: 403,
                    RECIPIENT_NOT_FOUND: 404,
                    INVALID_MESSAGE: 400,
                    INVALID_RECIPIENT: 400
                };

                send(ws, {
                    type: 'message_error',
                    success: false,
                    code: error.code || 'DATABASE_ERROR',
                    blocked: error.code === 'USER_BLOCKED',
                    message: error.message || 'Failed to save message',
                    status: status[error.code] || 500,
                    request_id: msg.request_id
                });
            }

            break;
        }


        case 'get_messages': {
            const client = clients.get(ws);

            if (!client.userId) {
                return send(ws, {
                    type: 'message_error',
                    success: false,
                    message: 'Not authenticated'
                });
            }

            const incomingId = Number(msg.incoming_id);

            if (
                !Number.isSafeInteger(incomingId) ||
                incomingId <= 0 ||
                incomingId === currentId
            ) {
                return sendError(ws, 'Invalid recipient ID');
            }

            try {
                // Verify recipient exists
                const [users] = await db.execute(
                    'SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1',
                    [incomingId]
                );

                if (!users.length) {
                    return sendError(ws, 'User not found');
                }

                // Fetch conversation messages
                const [messages] = await db.execute(
                    `SELECT
                m.msg_id,
                m.incoming_msg_id,
                m.outgoing_msg_id,
                m.encrypted_msg,
                m.encrypted_key_sender,
                m.encrypted_key_recipient,
                m.iv,
                u.img
            FROM messages m
            LEFT JOIN users u
                ON u.unique_id = m.outgoing_msg_id
            WHERE
                (
                    m.outgoing_msg_id = ?
                    AND m.incoming_msg_id = ?
                )
                OR
                (
                    m.outgoing_msg_id = ?
                    AND m.incoming_msg_id = ?
                )
            ORDER BY m.msg_id ASC`,
                    [
                        currentId,
                        incomingId,
                        incomingId,
                        currentId
                    ]
                );

                return send(ws, {
                    type: 'messages_response',
                    success: true,
                    request_id: msg.request_id,
                    incoming_id: incomingId,
                    messages
                });

            } catch (error) {
                console.error('Get messages error:', error);

                return send(ws, {
                    type: 'messages_response',
                    success: false,
                    message: 'Unable to load messages'
                });
            }
        }

        case 'message_delivered': {
            await updateMessageStatus({
                message_id: msg.msg_id,
                status: 'delivered'
            });


            let sender_id = msg.outgoing_msg_id

            const notification = {
                type: 'message_delivered',
                message: msg.msg_id,
                receiver: currentId
            };

            for (const [clientWs, connectedClient] of clients.entries()) {
                if (
                    connectedClient.userId === sender_id
                ) {
                    if (clientWs.readyState === WebSocket.OPEN) {
                        send(clientWs, notification);
                    }
                }
            }
            break
        }


        case 'message_seen': {
            await updateMessageStatus({
                message_id: msg.msg_id,
                status: 'seen'
            });

            sender_id = msg.outgoing_msg_id

            const notification = {
                type: 'message_seen',
                message: msg.msg_id,
                receiver: currentId
            };

            for (const [clientWs, connectedClient] of clients.entries()) {
                if (
                    connectedClient.userId === sender_id
                ) {
                    if (clientWs.readyState === WebSocket.OPEN) {
                        send(clientWs, notification);
                    }
                }
            }
            break
        }


        case 'mark_all_seen': {
            const withId = Number(msg.incoming_id);

            if (
                !Number.isSafeInteger(withId) ||
                withId <= 0 ||
                withId === currentId
            ) {
                return sendError(ws, 'Invalid conversation user ID');
            }

            try {
                const messages = await markConversationSeen(currentId, withId);


                const notification = {
                    type: 'message_seen',
                    receiver: currentId
                };

                    for (const [clientWs, connectedClient] of clients.entries()) {
                        if (
                            Number(connectedClient.userId) ===
                            Number(withId)
                        ) {
                            send(clientWs, notification);
                        }
                    }
                

            } catch (error) {
                console.error('Mark all seen error:', error);

            }

            break;
        }



        default:
            return sendError(ws, `Unknown message type: ${String(msg.type)}`, 'UNKNOWN_TYPE');
    }
}

wss.on('connection', (ws, request) => {
    const clientId = crypto.randomUUID();

    clients.set(ws, {
        id: clientId,
        username: `user-${ws.userId}`,
        userId: ws.userId,
        room: null,
        ip: request.socket.remoteAddress
    });

    markPendingMessagesDelivered(Number(ws.userId))
        .catch(error => {
            console.error('Failed to update pending deliveries:', error);
        });

    console.log(`Client connected: ${clientId}`);

    send(ws, {
        type: 'connected',
        clientId,
        message: 'WebSocket connection established'
    });



    ws.on('message', data => {
        handleMessage(ws, data).catch(error => {
            console.error('Message handler error:', error);
            sendError(ws, 'Internal server error', 'INTERNAL_ERROR');
        });
    });

    ws.on('error', error => {
        console.error(`WebSocket error (${clientId}):`, error.message);
    });

    ws.on('close', () => {
        removeFromRoom(ws);
        clients.delete(ws);
        console.log(`Client disconnected: ${clientId}`);
    });
});

async function startServer() {
    try {
        // Verify MySQL and create the message table if it does not exist.
        await db.query('SELECT 1');

        server.listen(PORT, () => {
            console.log(`HTTP server: http://5.189.157.103:${PORT}`);
            console.log(`WebSocket:   ws://5.189.157.103:${PORT}`);
            console.log('MySQL connected');
        });
    } catch (error) {
        console.error('Startup failed. Check your MySQL configuration:', error.message);
        process.exit(1);
    }
}

async function shutdown() {
    console.log('Shutting down...');

    for (const ws of wss.clients) {
        ws.close(1001, 'Server shutting down');
    }

    wss.close();
    server.close();

    try {
        await db.end();
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();

=======
/**
 * Generic WebSocket server with MySQL
 *
 * Install:
 *   npm install express ws mysql2 dotenv
 *
 * .env:
 *   PORT=8000
 *   DB_HOST=127.0.0.1
 *   DB_PORT=3306
 *   DB_USER=root
 *   DB_PASSWORD=your_password
 *   DB_NAME=michat
 *
 * Run:
 *   node server.js
 *
 * WebSocket URL:
 *   ws://localhost:8000
 *
 * Demo message types:
 *   { "type": "ping" }
 *   { "type": "echo", "data": { "hello": "world" } }
 *   { "type": "join", "room": "general", "username": "alice" }
 *   { "type": "leave" }
 *   { "type": "broadcast", "message": "Hello everyone" }
 *   { "type": "private", "to": "bob", "message": "Hello Bob" }
 *   { "type": "chat", "message": "Hello room" }
 */

require('dotenv').config();

const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
    noServer: true,
    maxPayload: 1024 * 1024
});


server.on('upgrade', async (request, socket, head) => {

    try {
        const cookie = request.headers.cookie;

        if (!cookie) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Validate the PHP session using the existing cookie.
        const response = await fetch(
            process.env.PHP_SESSION_VERIFY_URL,
            {
                method: 'GET',
                headers: {
                    Cookie: cookie,
                    Accept: 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            }
        );

        if (!response.ok) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        const auth = await response.json();

        if (
            !auth.success ||
            !Number.isSafeInteger(auth.user_id) ||
            auth.user_id <= 0
        ) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Authentication successful.
        wss.handleUpgrade(request, socket, head, (ws) => {

            // Trusted ID obtained from PHP session.
            ws.userId = auth.user_id;

            wss.emit('connection', ws, request);
        });

    } catch (error) {

        console.error('WebSocket authentication failed:', error.message);

        if (!socket.destroyed) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    }
});


const PORT = Number(process.env.PORT || 8000);

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chatapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Active connections and room membership
const clients = new Map();       // WebSocket -> client information
const rooms = new Map();         // room name -> Set<WebSocket>

// Basic HTTP health endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'WebSocket server',
        websocket: `ws://localhost:${PORT}`,
        connectedClients: clients.size,
        rooms: rooms.size
    });
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ success: true, websocket: 'running', mysql: 'connected' });
    } catch (error) {
        res.status(503).json({
            success: false,
            websocket: 'running',
            mysql: 'disconnected'
        });
    }
});

function send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function sendError(ws, message, code = 'BAD_REQUEST') {
    send(ws, {
        type: 'error',
        code,
        message
    });
}

function sendToRoom(roomName, payload, except = null) {
    const members = rooms.get(roomName);
    if (!members) return;

    for (const client of members) {
        if (client !== except) {
            send(client, payload);
        }
    }
}

function removeFromRoom(ws) {
    const client = clients.get(ws);
    if (!client || !client.room) return;

    const roomName = client.room;
    const members = rooms.get(roomName);

    if (members) {
        members.delete(ws);

        if (members.size === 0) {
            rooms.delete(roomName);
        }
    }

    client.room = null;

    sendToRoom(roomName, {
        type: 'user_left',
        username: client.username,
        room: roomName
    });
}


/**
 * Save an encrypted direct message using the same columns as the PHP endpoint.
 *
 * incoming_id = recipient's users.unique_id
 * sender_id   = authenticated sender's users.unique_id
 */
async function saveMessage({
    incoming_id,
    sender_id,
    encrypted_msg,
    encrypted_key_sender,
    encrypted_key_recipient,
    iv
}) {
    const recipientId = Number(incoming_id);
    const senderId = Number(sender_id);

    if (
        !Number.isSafeInteger(recipientId) || recipientId <= 0 ||
        !Number.isSafeInteger(senderId) || senderId <= 0 ||
        typeof encrypted_msg !== 'string' || !encrypted_msg ||
        typeof encrypted_key_sender !== 'string' || !encrypted_key_sender ||
        typeof encrypted_key_recipient !== 'string' || !encrypted_key_recipient ||
        typeof iv !== 'string' || !iv
    ) {
        const error = new Error('Missing or invalid encrypted message data');
        error.code = 'INVALID_MESSAGE';
        throw error;
    }

    if (recipientId === senderId) {
        const error = new Error('You cannot send a message to yourself');
        error.code = 'INVALID_RECIPIENT';
        throw error;
    }

    // Verify recipient exists.
    const [users] = await db.execute(
        'SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1',
        [recipientId]
    );

    if (users.length === 0) {
        const error = new Error('Recipient not found');
        error.code = 'RECIPIENT_NOT_FOUND';
        throw error;
    }

    // Match the PHP rule: reject if recipient has blocked sender.
    const [blocks] = await db.execute(
        `SELECT id
         FROM user_blocks
         WHERE blocker_id = ?
           AND blocked_id = ?
         LIMIT 1`,
        [recipientId, senderId]
    );

    if (blocks.length > 0) {
        const error = new Error('You cannot send messages to this user.');
        error.code = 'USER_BLOCKED';
        throw error;
    }

    // Store the encrypted payload in the existing MiChat messages table.
    const [result] = await db.execute(
        `INSERT INTO messages
            (
                incoming_msg_id,
                outgoing_msg_id,
                encrypted_msg,
                encrypted_key_sender,
                encrypted_key_recipient,
                iv
            )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            recipientId,
            senderId,
            encrypted_msg,
            encrypted_key_sender,
            encrypted_key_recipient,
            iv
        ]
    );

    return result.insertId;
}


async function getMessageById(messageId) {
    const [rows] = await db.execute(
        `SELECT
            m.msg_id,
            m.incoming_msg_id,
            m.outgoing_msg_id,
            m.encrypted_msg,
            m.encrypted_key_sender,
            m.encrypted_key_recipient,
            m.iv,
            u.img
         FROM messages m
         JOIN users u ON u.unique_id = m.outgoing_msg_id
         WHERE m.msg_id = ?
         LIMIT 1`,
        [messageId]
    );

    return rows[0] || null;
}

async function handleMessage(ws, rawData) {
    let msg;

    try {
        msg = JSON.parse(rawData.toString());
    } catch {
        return sendError(ws, 'Message must be valid JSON', 'INVALID_JSON');
    }

    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
        return sendError(ws, 'Message must be a JSON object');
    }

    const client = clients.get(ws);
    if (!client) return;

    switch (msg.type) {
        // Connection test: client sends ping, server responds with pong.
        case 'ping':
            return send(ws, {
                type: 'pong',
                timestamp: Date.now()
            });

        // Echo test: server returns the supplied data.
        case 'echo':
            return send(ws, {
                type: 'echo_response',
                data: msg.data ?? null,
                timestamp: Date.now()
            });

        // Set/update the client's display name.
        case 'identify': {
            const username = String(msg.username || '').trim();

            if (!username || username.length > 50) {
                return sendError(ws, 'A username of 1-50 characters is required');
            }

            client.username = username;

            return send(ws, {
                type: 'identified',
                clientId: client.id,
                username
            });
        }

        // Join a room. A client can be in one room at a time.
        case 'join': {
            const roomName = String(msg.room || '').trim();

            if (!roomName || roomName.length > 100) {
                return sendError(ws, 'A room name of 1-100 characters is required');
            }

            removeFromRoom(ws);

            if (!rooms.has(roomName)) {
                rooms.set(roomName, new Set());
            }

            rooms.get(roomName).add(ws);
            client.room = roomName;

            send(ws, {
                type: 'joined',
                room: roomName,
                username: client.username
            });

            sendToRoom(roomName, {
                type: 'user_joined',
                room: roomName,
                username: client.username
            }, ws);

            return send(ws, {
                type: 'room_info',
                room: roomName,
                members: [...rooms.get(roomName)].map(socket => ({
                    clientId: clients.get(socket)?.id,
                    username: clients.get(socket)?.username
                }))
            });
        }

        case 'leave':
            if (!client.room) {
                return sendError(ws, 'You are not in a room', 'NOT_IN_ROOM');
            }

            removeFromRoom(ws);
            return send(ws, { type: 'left' });

        // Broadcast to every connected client.
        case 'broadcast': {
            const message = String(msg.message ?? '');

            if (!message.trim() || message.length > 10000) {
                return sendError(ws, 'Message must contain 1-10000 characters');
            }

            const payload = {
                type: 'broadcast',
                sender: client.username,
                clientId: client.id,
                message,
                timestamp: Date.now()
            };

            for (const socket of wss.clients) {
                if (socket !== ws) send(socket, payload);
            }

            return send(ws, {
                type: 'broadcast_sent',
                message
            });
        }

        case 'chat': {
            if (!Number.isSafeInteger(Number(client.userId)) || Number(client.userId) <= 0) {
                return send(ws, {
                    type: 'message_error',
                    success: false,
                    code: 'NOT_AUTHENTICATED',
                    message: 'Authenticate your WebSocket connection before sending messages'
                });
            }

            try {
                const senderId = Number(client.userId);
                const recipientId = Number(msg.incoming_id);

                const messageId = await saveMessage({
                    incoming_id: recipientId,
                    sender_id: senderId,
                    encrypted_msg: msg.encrypted_msg,
                    encrypted_key_sender: msg.encrypted_key_sender,
                    encrypted_key_recipient: msg.encrypted_key_recipient,
                    iv: msg.iv
                });

                // Fetch the saved message, including the sender's profile image.
                const savedMessage = await getMessageById(messageId);

                // Acknowledge the sender.
console.log("Message saved:", messageId);
console.log("Socket state:", ws.readyState);
console.log("Request ID:", msg.request_id);

const response = {
    type: 'message_sent',
    success: true,
    msg_id: messageId,
    incoming_id: recipientId,
    request_id: msg.request_id
};

const sent = send(ws, response);

console.log("Acknowledgement sent:", sent);
                // Notify recipient and sender's other active connections.
                const notification = {
                    type: 'new_message',
                    message: savedMessage
                };

                for (const [clientWs, connectedClient] of clients.entries()) {
                    if (
                        connectedClient.userId === recipientId
                    ) {
                        if (clientWs.readyState === WebSocket.OPEN) {
                            send(clientWs, notification);
                        }
                    }
                }

            } catch (error) {
                const status = {
                    USER_BLOCKED: 403,
                    RECIPIENT_NOT_FOUND: 404,
                    INVALID_MESSAGE: 400,
                    INVALID_RECIPIENT: 400
                };

                send(ws, {
                    type: 'message_error',
                    success: false,
                    code: error.code || 'DATABASE_ERROR',
                    blocked: error.code === 'USER_BLOCKED',
                    message: error.message || 'Failed to save message',
                    status: status[error.code] || 500,
                    request_id: msg.request_id
                });
            }

            break;
        }
        case 'get_messages': {
            const client = clients.get(ws);

            if (!client.userId) {
                return send(ws, {
                    type: 'message_error',
                    success: false,
                    message: 'Not authenticated'
                });
            }

            const incomingId = Number(msg.incoming_id);
            const currentId = Number(client.userId);

            if (
                !Number.isSafeInteger(incomingId) ||
                incomingId <= 0 ||
                incomingId === currentId
            ) {
                return sendError(ws, 'Invalid recipient ID');
            }

            try {
                // Verify recipient exists
                const [users] = await db.execute(
                    'SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1',
                    [incomingId]
                );

                if (!users.length) {
                    return sendError(ws, 'User not found');
                }

                // Fetch conversation messages
                const [messages] = await db.execute(
                    `SELECT
                m.msg_id,
                m.incoming_msg_id,
                m.outgoing_msg_id,
                m.encrypted_msg,
                m.encrypted_key_sender,
                m.encrypted_key_recipient,
                m.iv,
                u.img
            FROM messages m
            LEFT JOIN users u
                ON u.unique_id = m.outgoing_msg_id
            WHERE
                (
                    m.outgoing_msg_id = ?
                    AND m.incoming_msg_id = ?
                )
                OR
                (
                    m.outgoing_msg_id = ?
                    AND m.incoming_msg_id = ?
                )
            ORDER BY m.msg_id ASC`,
                    [
                        currentId,
                        incomingId,
                        incomingId,
                        currentId
                    ]
                );

                return send(ws, {
                    type: 'messages_response',
                    success: true,
                    request_id: msg.request_id,
                    incoming_id: incomingId,
                    messages
                });

            } catch (error) {
                console.error('Get messages error:', error);

                return send(ws, {
                    type: 'messages_response',
                    success: false,
                    message: 'Unable to load messages'
                });
            }
        }

        // Ask the server for current connection/room information.
        case 'status':
            return send(ws, {
                type: 'status',
                clientId: client.id,
                username: client.username,
                room: client.room,
                connectedClients: clients.size,
                rooms: [...rooms.keys()]
            });

        default:
            return sendError(ws, `Unknown message type: ${String(msg.type)}`, 'UNKNOWN_TYPE');
    }
}

wss.on('connection', (ws, request) => {
    const clientId = crypto.randomUUID();

    clients.set(ws, {
        id: clientId,
        username: `user-${ws.userId}`,
        userId: ws.userId,
        room: null,
        ip: request.socket.remoteAddress
    });

    console.log(`Client connected: ${clientId}`);

    send(ws, {
        type: 'connected',
        clientId,
        message: 'WebSocket connection established'
    });

    ws.on('message', data => {
        handleMessage(ws, data).catch(error => {
            console.error('Message handler error:', error);
            sendError(ws, 'Internal server error', 'INTERNAL_ERROR');
        });
    });

    ws.on('error', error => {
        console.error(`WebSocket error (${clientId}):`, error.message);
    });

    ws.on('close', () => {
        removeFromRoom(ws);
        clients.delete(ws);
        console.log(`Client disconnected: ${clientId}`);
    });
});

async function startServer() {
    try {
        // Verify MySQL and create the message table if it does not exist.
        await db.query('SELECT 1');

        server.listen(PORT, () => {
            console.log(`HTTP server: http://localhost:${PORT}`);
            console.log(`WebSocket:   ws://localhost:${PORT}`);
            console.log('MySQL connected');
        });
    } catch (error) {
        console.error('Startup failed. Check your MySQL configuration:', error.message);
        process.exit(1);
    }
}

async function shutdown() {
    console.log('Shutting down...');

    for (const ws of wss.clients) {
        ws.close(1001, 'Server shutting down');
    }

    wss.close();
    server.close();

    try {
        await db.end();
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();

>>>>>>> origin/main
module.exports = { server, wss, db, saveMessage };