<<<<<<< HEAD

window.initChat = async function (root) {

    const chatArea = root?.querySelector(".chat-area");
    const ws = window.michatWS;

    if (!chatArea) {
        console.error("Chat area not found.");
        return;
    }

    // Stop previous polling
    if (window.michatPolling) {
        clearInterval(window.michatPolling);
        window.michatPolling = null;
    }

    // Elements
    const form = chatArea.querySelector(".typing-area");
    const chatBox = chatArea.querySelector(".chat-box");

    if (!chatBox) {
        console.error("Chat box not found.");
        return;
    }

    // Form may not exist if recipient blocked current user
    const incomingInput = form?.querySelector(".incoming_id");
    const inputField = form?.querySelector(".input-field");
    const sendBtn = form?.querySelector(".send-button");

    const incoming_id =
        incomingInput?.value || chatArea.dataset.chatUser;

    const current_id = chatBox.dataset.currentId;

    // Sending is available only when composer exists
    const canSendMessages = !!(
        form &&
        incomingInput &&
        inputField &&
        sendBtn
    );

    // Encryption keys
    let myPublicKey = null;
    let myPrivateKey = null;

    try {
        myPublicKey = JSON.parse(
            localStorage.getItem("michat_public_key")
        );

        myPrivateKey = JSON.parse(
            localStorage.getItem("michat_private_key")
        );
    } catch (error) {
        console.error("Encryption key parsing failed:", error);
    }

    let recipientPublicKey = null;
    let loadingMessages = false;
    let stopped = false;

    // ---------------------------------
    // LOAD RECIPIENT PUBLIC KEY
    // ---------------------------------

    async function loadRecipientPublicKey() {

        const response = await fetch("php/get_public_key.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                unique_id: incoming_id
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load public key"
            );
        }

        recipientPublicKey = data.public_key;
    }



    async function addMsgElement(msg, plaintext = null) {

        if (!msg || !chatBox?.isConnected) return;

        if (
            msg.msg_id &&
            chatBox.querySelector(`[data-msg-id="${msg.msg_id}"]`)
        ) return;

        const emptyMessage = chatBox.querySelector(".text");
        emptyMessage?.remove();

        const isSender =
            String(msg.outgoing_msg_id) === window.MICHAT_CURRENT_USER;

        const messageElement = document.createElement("div");

        messageElement.className = isSender ?
            "chat outgoing" :
            "chat incoming";

        if (msg.msg_id) {
            messageElement.dataset.msgId = msg.msg_id;
        }

        if (!isSender) {
            const img = document.createElement("img");

            img.src = msg.img ?
                "php/images/" + encodeURIComponent(msg.img) :
                "php/images/default.png";

            img.alt = "";

            messageElement.appendChild(img);
        }

        const details = document.createElement("div");
        details.className = "details";

        const paragraph = document.createElement("p");

        if (plaintext !== null) {
            paragraph.textContent = plaintext;
        } else {
            try {
                paragraph.textContent = await decryptChatMessage(
                    msg,
                    myPrivateKey,
                    isSender
                );
            } catch (error) {
                console.error("Decryption error:", error);
                paragraph.textContent = "[Unable to decrypt message]";
            }
        }

        details.appendChild(paragraph);
        messageElement.appendChild(details);

        if (!chatBox.isConnected) return;

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const pendingMessages = new Map();

    async function sendMessage() {

        if (!canSendMessages || stopped) return;

        const message = inputField.value.trim();

        if (!message || !recipientPublicKey) return;

        if (ws.readyState !== WebSocket.OPEN) {
            alert("Connection to chat server is unavailable.");
            return;
        }

        sendBtn.disabled = true;

        try {
            const requestId = crypto.randomUUID();

            const encrypted = await encryptChatMessage(
                message,
                myPublicKey,
                recipientPublicKey
            );

            ws.send(JSON.stringify({
                type: "chat",
                incoming_id: Number(incoming_id),
                request_id: requestId,
                encrypted_msg: encrypted.encrypted_msg,
                encrypted_key_sender: encrypted.encrypted_key_sender,
                encrypted_key_recipient: encrypted.encrypted_key_recipient,
                iv: encrypted.iv,
                disappear_after_seconds: window.michatDisappearAfterSeconds || 0,
            }));

            pendingMessages.set(requestId, {
                text: message,
                recipientId: incoming_id,
                senderId: current_id
            });

        } catch (error) {

            console.error("Send error:", error);
            alert(error.message);


        } finally {
            sendBtn.disabled = false;
        }
    }
    // ---------------------------------
    // SHOW BLOCKED NOTICE
    // ---------------------------------

    function showBlockedNotice(message) {

        if (!form || !form.isConnected) return;

        const notice = document.createElement("div");

        notice.className = "chat-blocked-notice";

        const icon = document.createElement("i");
        icon.className = "fas fa-ban";

        const text = document.createElement("span");
        text.textContent = message;

        notice.append(icon, text);

        form.replaceWith(notice);
    }


    // ---------------------------------
    // FETCH AND DECRYPT MESSAGES
    // ---------------------------------

    const pendingRequests = new Map();

    function requestWebSocket(type, payload) {

        return new Promise((resolve, reject) => {

            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not connected"));
                return;
            }

            const requestId = crypto.randomUUID();

            const timeout = setTimeout(() => {
                pendingRequests.delete(requestId);
                reject(new Error("WebSocket request timed out"));
            }, 15000);

            pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout
            });

            ws.send(JSON.stringify({
                type,
                request_id: requestId,
                ...payload
            }));
        });
    }

    async function getMessages() {

        if (loadingMessages || stopped) return;

        loadingMessages = true;

        try {

            const response = await fetch("php/get-chat.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    incoming_id
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load messages"
                );
            }

            if (stopped || !chatBox.isConnected) return;

            const shouldScroll =
                !chatBox.classList.contains("active") ||
                chatBox.scrollHeight -
                chatBox.scrollTop -
                chatBox.clientHeight < 100;

            const fragment = document.createDocumentFragment();

            if (!data.messages.length) {

                const empty = document.createElement("div");

                empty.className = "text";

                empty.textContent =
                    "No messages yet. Start a conversation.";

                fragment.appendChild(empty);
            }

            for (const msg of data.messages) {

                if (stopped) return;

                const isSender =
                    String(msg.outgoing_msg_id) === String(current_id);

                const messageElement = document.createElement("div");

                messageElement.className = isSender
                    ? "chat outgoing"
                    : "chat incoming";

                if (!isSender) {

                    const img = document.createElement("img");

                    img.src = msg.img
                        ? "php/images/" + encodeURIComponent(msg.img)
                        : "php/images/default.png";

                    img.alt = "";

                    messageElement.appendChild(img);
                }

                const details = document.createElement("div");

                details.className = "details";

                const paragraph = document.createElement("p");

                try {

                    const decrypted = await decryptChatMessage(
                        msg,
                        myPrivateKey,
                        isSender
                    );

                    paragraph.textContent = decrypted;

                } catch (error) {

                    console.error(
                        "Decryption error:",
                        msg.msg_id,
                        error
                    );

                    paragraph.textContent =
                        "This message is not available on your device!";
                }

                details.appendChild(paragraph);
                if (isSender) {
                    details.style.position = "relative";
                    details.style.paddingBottom = "15px";

                    const tick = document.createElement("span");

                    tick.style.cssText = `position: absolute;right: 5px;bottom: 14px;display: block;text-align: right;font-size: 12px;letter-spacing: -3px;`;

                    if (msg.seen_at) {
                        tick.textContent = "✓✓";
                        tick.style.color = "#53bdeb";
                        tick.classList.add('status-seen');

                    } else if (msg.delivered_at) {
                        // Delivered: double grey tick
                        tick.textContent = "✓✓";
                        tick.style.color = "#9ca3af";
                        tick.classList.add('status-delivered');

                    } else {
                        // Sent: single grey tick
                        tick.textContent = "✓";
                        tick.style.color = "#9ca3af";
                        tick.style.letterSpacing = "normal";
                        tick.classList.add('status-sent');
                    }

                    details.appendChild(tick);
                }
                details.style.position = 'relative'
                messageElement.appendChild(details);

                fragment.appendChild(messageElement);
            }

            if (stopped || !chatBox.isConnected) return;

            chatBox.replaceChildren(fragment);

            if (ws.readyState !== WebSocket.OPEN) {
                alert("Connection to chat server is unavailable.");
            } else {
                ws.send(JSON.stringify({
                    type: "mark_all_seen",
                    incoming_id: incoming_id
                }));
            }




            if (shouldScroll) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }

        } catch (error) {

            console.error("Get messages error:", error);

        } finally {

            loadingMessages = false;
        }
    }


    // ---------------------------------
    // CHAT EVENTS
    // ---------------------------------

    if (canSendMessages) {

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            sendMessage();
        });

        inputField.addEventListener("input", () => {

            sendBtn.classList.toggle(
                "active",
                inputField.value.trim() !== ""
            );

        });

    }

    chatBox.addEventListener("mouseenter", () => {
        chatBox.classList.add("active");
    });

    chatBox.addEventListener("mouseleave", () => {
        chatBox.classList.remove("active");
    });


    // ---------------------------------
    // INITIALIZE CHAT
    // ---------------------------------

    try {

        if (!myPublicKey || !myPrivateKey) {
            throw new Error("Encryption keys not found");
        }

        // Only load recipient key if sending is available
        if (canSendMessages) {
            await loadRecipientPublicKey();
        }

        // Previous messages can still be loaded
        await getMessages();

        if (stopped || !chatBox.isConnected) return;



        if (canSendMessages && inputField?.isConnected) {
            inputField.focus();
        }

    } catch (error) {

        console.error("Chat initialization failed:", error);

        if (chatBox.isConnected) {
            chatBox.textContent = error.message;
        }
    }



    window.michatMessageHandler = async (data) => {

        switch (data.type) {

            case "connected":
                console.log("WebSocket ready:", data.clientId);
                break;

            case "message_sent": {
                if (!data.success) break;

                const pending = pendingMessages.get(data.request_id);

                if (!pending) {
                    console.warn("Pending message not found:", data.request_id);
                    break;
                }

                pendingMessages.delete(data.request_id);

                if (inputField?.isConnected) {
                    inputField.value = "";
                    sendBtn?.classList.remove("active");
                }

                await addMsgElement({
                    msg_id: data.msg_id,
                    outgoing_msg_id: window.MICHAT_CURRENT_USER,
                    incoming_msg_id: data.incoming_id
                }, pending.text);

                break;
            }

            case "new_message":
                addMsgElement(data.message);
                break;

            case "message_error":
                if (data.blocked) {
                    showBlockedNotice(
                        "You cannot send messages to this user."
                    );
                }

                alert(data.message || "Message sending failed");
                break;

            case 'message_seen':
                let receiver= data.receiver;
                if (receiver == incoming_id){
                    document.querySelectorAll('.status-delivered').forEach(element => {
                        element.classList.add('status-seen');
                        element.classList.remove('status-delivered');
                        element.style.color = 'rgb(83, 189, 235)';
                    });
                    document.querySelectorAll('.status-sent').forEach(element => {
                        element.classList.add('status-seen');
                        element.classList.remove('status-sent');
                        element.style.color = 'rgb(83, 189, 235)';
                    });
                }
                break;

            case "error":
                console.error("WebSocket error:", data.message);
                break;
        }
    };
    // ---------------------------------
    // CLEANUP
    // ---------------------------------

    return function cleanup() {

        stopped = true;

        if (window.michatMessageHandler) {
            window.michatMessageHandler = null;
        }

        if (window.michatPolling) {
            clearInterval(window.michatPolling);
            window.michatPolling = null;
        }
    };


};
=======

window.initChat = async function (root) {

    const chatArea = root?.querySelector(".chat-area");

    if (!chatArea) {
        console.error("Chat area not found.");
        return;
    }

    // Stop previous polling
    if (window.michatPolling) {
        clearInterval(window.michatPolling);
        window.michatPolling = null;
    }

    // Elements
    const form = chatArea.querySelector(".typing-area");
    const chatBox = chatArea.querySelector(".chat-box");

    if (!chatBox) {
        console.error("Chat box not found.");
        return;
    }

    // Form may not exist if recipient blocked current user
    const incomingInput = form?.querySelector(".incoming_id");
    const inputField = form?.querySelector(".input-field");
    const sendBtn = form?.querySelector(".send-button");

    const incoming_id =
        incomingInput?.value || chatArea.dataset.chatUser;

    const current_id = chatBox.dataset.currentId;

    // Sending is available only when composer exists
    const canSendMessages = !!(
        form &&
        incomingInput &&
        inputField &&
        sendBtn
    );

    // Encryption keys
    let myPublicKey = null;
    let myPrivateKey = null;

    try {
        myPublicKey = JSON.parse(
            localStorage.getItem("michat_public_key")
        );

        myPrivateKey = JSON.parse(
            localStorage.getItem("michat_private_key")
        );
    } catch (error) {
        console.error("Encryption key parsing failed:", error);
    }

    let recipientPublicKey = null;
    let loadingMessages = false;
    let stopped = false;

    // ---------------------------------
    // LOAD RECIPIENT PUBLIC KEY
    // ---------------------------------

    async function loadRecipientPublicKey() {

        const response = await fetch("php/get_public_key.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                unique_id: incoming_id
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load public key"
            );
        }

        recipientPublicKey = data.public_key;
    }



    async function addMsgElement(msg, plaintext = null) {

        if (!msg || !chatBox?.isConnected) return;

        if (
            msg.msg_id &&
            chatBox.querySelector(`[data-msg-id="${msg.msg_id}"]`)
        ) return;

        const emptyMessage = chatBox.querySelector(".text");
        emptyMessage?.remove();

        const isSender =
            String(msg.outgoing_msg_id) === window.MICHAT_CURRENT_USER;

        const messageElement = document.createElement("div");

        messageElement.className = isSender ?
            "chat outgoing" :
            "chat incoming";

        if (msg.msg_id) {
            messageElement.dataset.msgId = msg.msg_id;
        }

        if (!isSender) {
            const img = document.createElement("img");

            img.src = msg.img ?
                "php/images/" + encodeURIComponent(msg.img) :
                "php/images/default.png";

            img.alt = "";

            messageElement.appendChild(img);
        }

        const details = document.createElement("div");
        details.className = "details";

        const paragraph = document.createElement("p");

        if (plaintext !== null) {
            paragraph.textContent = plaintext;
        } else {
            try {
                paragraph.textContent = await decryptChatMessage(
                    msg,
                    myPrivateKey,
                    isSender
                );
            } catch (error) {
                console.error("Decryption error:", error);
                paragraph.textContent = "[Unable to decrypt message]";
            }
        }

        details.appendChild(paragraph);
        messageElement.appendChild(details);

        if (!chatBox.isConnected) return;

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const pendingMessages = new Map();

    async function sendMessage() {

        if (!canSendMessages || stopped) return;

        const message = inputField.value.trim();

        if (!message || !recipientPublicKey) return;

        if (ws.readyState !== WebSocket.OPEN) {
            alert("Connection to chat server is unavailable.");
            return;
        }

        sendBtn.disabled = true;

        try {
            const requestId = crypto.randomUUID();

            const encrypted = await encryptChatMessage(
                message,
                myPublicKey,
                recipientPublicKey
            );

            ws.send(JSON.stringify({
                type: "chat",

                incoming_id: Number(incoming_id),
                request_id: requestId,
                encrypted_msg: encrypted.encrypted_msg,
                encrypted_key_sender: encrypted.encrypted_key_sender,
                encrypted_key_recipient: encrypted.encrypted_key_recipient,
                iv: encrypted.iv
            }));

            pendingMessages.set(requestId, {
                text: message,
                recipientId: incoming_id,
                senderId: current_id
            });

        } catch (error) {

            console.error("Send error:", error);
            alert(error.message);


        } finally {
            sendBtn.disabled = false;
        }
    }
    // ---------------------------------
    // SHOW BLOCKED NOTICE
    // ---------------------------------

    function showBlockedNotice(message) {

        if (!form || !form.isConnected) return;

        const notice = document.createElement("div");

        notice.className = "chat-blocked-notice";

        const icon = document.createElement("i");
        icon.className = "fas fa-ban";

        const text = document.createElement("span");
        text.textContent = message;

        notice.append(icon, text);

        form.replaceWith(notice);
    }


    // ---------------------------------
    // FETCH AND DECRYPT MESSAGES
    // ---------------------------------

    const pendingRequests = new Map();

    function requestWebSocket(type, payload) {

        return new Promise((resolve, reject) => {

            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not connected"));
                return;
            }

            const requestId = crypto.randomUUID();

            const timeout = setTimeout(() => {
                pendingRequests.delete(requestId);
                reject(new Error("WebSocket request timed out"));
            }, 15000);

            pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout
            });

            ws.send(JSON.stringify({
                type,
                request_id: requestId,
                ...payload
            }));
        });
    }

    async function getMessages() {

        if (loadingMessages || stopped) return;

        loadingMessages = true;

        try {

            const response = await fetch("php/get-chat.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    incoming_id
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load messages"
                );
            }

            if (stopped || !chatBox.isConnected) return;

            const shouldScroll =
                !chatBox.classList.contains("active") ||
                chatBox.scrollHeight -
                chatBox.scrollTop -
                chatBox.clientHeight < 100;

            const fragment = document.createDocumentFragment();

            if (!data.messages.length) {

                const empty = document.createElement("div");

                empty.className = "text";

                empty.textContent =
                    "No messages yet. Start a conversation.";

                fragment.appendChild(empty);
            }

            for (const msg of data.messages) {

                if (stopped) return;

                const isSender =
                    String(msg.outgoing_msg_id) === String(current_id);

                const messageElement = document.createElement("div");

                messageElement.className = isSender
                    ? "chat outgoing"
                    : "chat incoming";

                if (!isSender) {

                    const img = document.createElement("img");

                    img.src = msg.img
                        ? "php/images/" + encodeURIComponent(msg.img)
                        : "php/images/default.png";

                    img.alt = "";

                    messageElement.appendChild(img);
                }

                const details = document.createElement("div");

                details.className = "details";

                const paragraph = document.createElement("p");

                try {

                    const decrypted = await decryptChatMessage(
                        msg,
                        myPrivateKey,
                        isSender
                    );

                    paragraph.textContent = decrypted;

                } catch (error) {

                    console.error(
                        "Decryption error:",
                        msg.msg_id,
                        error
                    );

                    paragraph.textContent =
                        "This message is not available on your device!";
                }

                details.appendChild(paragraph);

                messageElement.appendChild(details);

                fragment.appendChild(messageElement);
            }

            if (stopped || !chatBox.isConnected) return;

            chatBox.replaceChildren(fragment);

            if (shouldScroll) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }

        } catch (error) {

            console.error("Get messages error:", error);

        } finally {

            loadingMessages = false;
        }
    }


    // ---------------------------------
    // CHAT EVENTS
    // ---------------------------------

    if (canSendMessages) {

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            sendMessage();
        });

        inputField.addEventListener("input", () => {

            sendBtn.classList.toggle(
                "active",
                inputField.value.trim() !== ""
            );

        });

    }

    chatBox.addEventListener("mouseenter", () => {
        chatBox.classList.add("active");
    });

    chatBox.addEventListener("mouseleave", () => {
        chatBox.classList.remove("active");
    });


    // ---------------------------------
    // INITIALIZE CHAT
    // ---------------------------------

    try {

        if (!myPublicKey || !myPrivateKey) {
            throw new Error("Encryption keys not found");
        }

        // Only load recipient key if sending is available
        if (canSendMessages) {
            await loadRecipientPublicKey();
        }

        // Previous messages can still be loaded
        await getMessages();

        if (stopped || !chatBox.isConnected) return;



        if (canSendMessages && inputField?.isConnected) {
            inputField.focus();
        }

    } catch (error) {

        console.error("Chat initialization failed:", error);

        if (chatBox.isConnected) {
            chatBox.textContent = error.message;
        }
    }



    const ws = new WebSocket("ws://localhost:8000");

    ws.onopen = () => {
        console.log("WebSocket connected");
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("RAW MESSAGE RECEIVED:", event.data);
        switch (data.type) {

            case "connected":
                console.log("WebSocket ready:", data.clientId);
                break;

            case "message_sent": {
                if (!data.success) break;

                const pending = pendingMessages.get(data.request_id);

                if (!pending) {
                    console.warn("Pending message not found:", data.request_id);
                    break;
                }

                pendingMessages.delete(data.request_id);

                document.querySelector(".input-field").value = "";
                document.querySelector(".send-button")?.classList.remove("active");

                await addMsgElement({
                    msg_id: data.msg_id,
                    outgoing_msg_id: window.MICHAT_CURRENT_USER,
                    incoming_msg_id: data.incoming_id
                }, pending.text);

                break;
            }

            case "message_error":
                if (data.blocked) {
                    showBlockedNotice(
                        "You cannot send messages to this user."
                    );
                }

                alert(data.message || "Message sending failed");
                break;
            case "new_message": {
                const msg = data.message;

                if (!msg) {
                    console.error("New message payload is missing");
                    break;
                }

                const from = String(msg.outgoing_msg_id);

                // Check whether this sender's chat is currently open.
                const activeChat = document.querySelector(".chat-area");

                const isChatOpen =
                    activeChat &&
                    String(activeChat.dataset.chatUser) === from &&
                    chatBox?.isConnected;

                if (isChatOpen) {

                    // Add and decrypt the incoming message.
                    await addMsgElement(msg);

                } else {

                    // Show notification for a message from another user.
                    showNewMessagePopup(msg);
                }

                break;
            }


            case "error":
                console.error("WebSocket error:", data.message);
                break;
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
        console.error("WebSocket connection error:", error);
    };

    // ---------------------------------
    // CLEANUP
    // ---------------------------------

    return function cleanup() {

        stopped = true;

        if (window.michatPolling) {
            clearInterval(window.michatPolling);
            window.michatPolling = null;
        }
    };



};
>>>>>>> origin/main
