<<<<<<< HEAD

const inboxPanel = document.getElementById("inboxPanel");
const conversationPanel = document.getElementById("conversationPanel");

let activeChatUser = null;
let chatRequestController = null;

// Open a conversation
async function openConversation(userId, updateHistory = true) {

    if (!userId) return;

    if (activeChatUser === String(userId)) {
        return;
    }

    activeChatUser = String(userId);

    // Cancel previous chat request
    if (chatRequestController) {
        chatRequestController.abort();
    }

    chatRequestController = new AbortController();

    conversationPanel.innerHTML = `
        <div class="conversation-placeholder">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Opening conversation...</p>
        </div>
    `;

    conversationPanel.classList.add("chat-open");
    inboxPanel.classList.add("inbox-hidden");

    try {

        const response = await fetch(
            "php/chat-window.php?user_id=" + encodeURIComponent(userId),
            {
                signal: chatRequestController.signal
            }
        );

        if (!response.ok) {
            throw new Error("Unable to open conversation");
        }

        const html = await response.text();

        // Ignore stale responses
        if (activeChatUser !== String(userId)) return;

        conversationPanel.innerHTML = html;

        // Initialize encryption and message handlers
        if (typeof window.initChat === "function") {
            await window.initChat(conversationPanel);
        }

        // Update URL without reloading
        if (updateHistory) {
            history.pushState(
                { userId: String(userId) },
                "",
                "users.php?user_id=" + encodeURIComponent(userId)
            );
        }

        // Highlight selected user
        document.querySelectorAll(".users-list a").forEach(link => {
            link.classList.toggle(
                "active",
                link.href.includes("user_id=" + encodeURIComponent(userId))
            );
        });

    } catch (error) {

        if (error.name === "AbortError") return;

        console.error("Open chat error:", error);

        conversationPanel.innerHTML = `
            <div class="conversation-placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

// Prevent HTML injection in error text
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
}

// Handle conversation clicks
document.querySelector(".users-list").addEventListener("click", (e) => {

    const link = e.target.closest("a");

    if (!link) return;

    const url = new URL(link.href, window.location.href);

    const userId = url.searchParams.get("user_id");

    if (!userId) return;

    e.preventDefault();

    openConversation(userId);
});

// Mobile back button
conversationPanel.addEventListener("click", (e) => {

    if (e.target.closest("#backToInbox")) {
        inboxPanel.classList.remove("inbox-hidden");
        conversationPanel.classList.remove("chat-open");

        activeChatUser = null;

        history.pushState({}, "", "users.php");
    }
});

// Browser back/forward support
window.addEventListener("popstate", (e) => {

    const userId =
        e.state?.userId ||
        new URLSearchParams(window.location.search).get("user_id");

    if (userId) {
        openConversation(userId, false);
    } else {
        activeChatUser = null;
        inboxPanel.classList.remove("inbox-hidden");
        conversationPanel.classList.remove("chat-open");
        conversationPanel.innerHTML = `
            <div class="conversation-placeholder">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h2>Your conversations, in one place.</h2>
                <p>Select a conversation to start messaging.</p>
            </div>
        `;
    }
});

// Support direct links and page refresh
const initialUserId = new URLSearchParams(
    window.location.search
).get("user_id");

if (initialUserId) {
    openConversation(initialUserId, false);
}
=======

const inboxPanel = document.getElementById("inboxPanel");
const conversationPanel = document.getElementById("conversationPanel");

let activeChatUser = null;
let chatRequestController = null;

// Open a conversation
async function openConversation(userId, updateHistory = true) {

    if (!userId) return;

    if (activeChatUser === String(userId)) {
        return;
    }

    activeChatUser = String(userId);

    // Cancel previous chat request
    if (chatRequestController) {
        chatRequestController.abort();
    }

    chatRequestController = new AbortController();

    conversationPanel.innerHTML = `
        <div class="conversation-placeholder">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Opening conversation...</p>
        </div>
    `;

    conversationPanel.classList.add("chat-open");
    inboxPanel.classList.add("inbox-hidden");

    try {

        const response = await fetch(
            "php/chat-window.php?user_id=" + encodeURIComponent(userId),
            {
                signal: chatRequestController.signal
            }
        );

        if (!response.ok) {
            throw new Error("Unable to open conversation");
        }

        const html = await response.text();

        // Ignore stale responses
        if (activeChatUser !== String(userId)) return;

        conversationPanel.innerHTML = html;

        // Initialize encryption and message handlers
        if (typeof window.initChat === "function") {
            await window.initChat(conversationPanel);
        }

        // Update URL without reloading
        if (updateHistory) {
            history.pushState(
                { userId: String(userId) },
                "",
                "users.php?user_id=" + encodeURIComponent(userId)
            );
        }

        // Highlight selected user
        document.querySelectorAll(".users-list a").forEach(link => {
            link.classList.toggle(
                "active",
                link.href.includes("user_id=" + encodeURIComponent(userId))
            );
        });

    } catch (error) {

        if (error.name === "AbortError") return;

        console.error("Open chat error:", error);

        conversationPanel.innerHTML = `
            <div class="conversation-placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

// Prevent HTML injection in error text
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
}

// Handle conversation clicks
document.querySelector(".users-list").addEventListener("click", (e) => {

    const link = e.target.closest("a");

    if (!link) return;

    const url = new URL(link.href, window.location.href);

    const userId = url.searchParams.get("user_id");

    if (!userId) return;

    e.preventDefault();

    openConversation(userId);
});

// Mobile back button
conversationPanel.addEventListener("click", (e) => {

    if (e.target.closest("#backToInbox")) {
        inboxPanel.classList.remove("inbox-hidden");
        conversationPanel.classList.remove("chat-open");

        activeChatUser = null;

        history.pushState({}, "", "users.php");
    }
});

// Browser back/forward support
window.addEventListener("popstate", (e) => {

    const userId =
        e.state?.userId ||
        new URLSearchParams(window.location.search).get("user_id");

    if (userId) {
        openConversation(userId, false);
    } else {
        activeChatUser = null;
        inboxPanel.classList.remove("inbox-hidden");
        conversationPanel.classList.remove("chat-open");
        conversationPanel.innerHTML = `
            <div class="conversation-placeholder">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h2>Your conversations, in one place.</h2>
                <p>Select a conversation to start messaging.</p>
            </div>
        `;
    }
});

// Support direct links and page refresh
const initialUserId = new URLSearchParams(
    window.location.search
).get("user_id");

if (initialUserId) {
    openConversation(initialUserId, false);
}
>>>>>>> origin/main
