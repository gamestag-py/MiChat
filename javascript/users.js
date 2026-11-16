<<<<<<< HEAD

const searchBar = document.querySelector(".search input");
const searchIcon = document.querySelector(".search button");
const usersList = document.querySelector(".users-list");

// Persistent chat storage
let chats = [];
const chatElements = new Map();

let isFetching = false;

// Search button
searchIcon.onclick = () => {
    searchBar.classList.toggle("show");
    searchIcon.classList.toggle("active");
    searchBar.focus();

    if (searchBar.classList.contains("active")) {
        searchBar.value = "";
        searchBar.classList.remove("active");
        fetchUsers();
    }
};

// Create a chat element only once
function createChat(user) {
    const link = document.createElement("a");
    link.href = `chat.php?user_id=${encodeURIComponent(user.unique_id)}`;

    const content = document.createElement("div");
    content.className = "content";

    const image = document.createElement("img");
    image.alt = user.full_name;

    const details = document.createElement("div");
    details.className = "details";

    const name = document.createElement("span");
    const message = document.createElement("p");

    details.append(name, message);
    content.append(image, details);

    const status = document.createElement("div");
    status.className = "status-dot";

    const circle = document.createElement("i");
    circle.className = "fas fa-circle";

    status.appendChild(circle);

    link.append(content, status);

    return {
        element: link,
        image,
        name,
        message,
        status
    };
}

// Update existing chat without recreating its DOM
function updateChat(user, chat) {
    const { image, name, message, status } = chat;

    const imageSrc = `php/images/${encodeURIComponent(user.img)}`;

    if (image.src !== new URL(imageSrc, document.baseURI).href) {
        image.src = imageSrc;
    }

    if (image.alt !== user.full_name) {
        image.alt = user.full_name;
    }

    if (name.textContent !== user.full_name) {
        name.textContent = user.full_name;
    }

    const lastMessage =
        (user.is_sender ? "You: " : "") + user.last_message;

    if (message.textContent !== lastMessage) {
        message.textContent = lastMessage;
    }

    const offline = !user.online;

    if (status.classList.contains("offline") !== offline) {
        status.classList.toggle("offline", offline);
    }
}

// Synchronize chat order without recreating elements
function reorderChats(users) {
    const orderedIds = users.map(user => String(user.unique_id));

    // Keep previously loaded chats that are absent from this response
    chatElements.forEach((chat, id) => {
        if (!orderedIds.includes(id)) {
            orderedIds.push(id);
        }
    });

    const currentElements = Array.from(usersList.children);

    orderedIds.forEach((id, index) => {
        const chat = chatElements.get(id);

        if (!chat) return;

        const currentElement = usersList.children[index];

        // Move only when the position is different
        if (currentElement !== chat.element) {
            usersList.insertBefore(
                chat.element,
                currentElement || null
            );
        }
    });
}

// Process new API response
function syncChats(users) {
    // Store latest response in the persistent array
    chats = users;

    chats.forEach(user => {
        const id = String(user.unique_id);

        let chat = chatElements.get(id);

        // Create only new chats
        if (!chat) {
            chat = createChat(user);
            chatElements.set(id, chat);
        }

        // Update data without replacing DOM
        updateChat(user, chat);
    });

    // Change order according to API response
    reorderChats(chats);
}

// Fetch users JSON
async function fetchUsers() {
    if (isFetching) return;
    if (searchBar.classList.contains("active")) return;

    isFetching = true;

    try {
        const response = await fetch("php/users.php");

        if (response.status === 401) {
            window.location.href = "login.php";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to fetch users");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Request failed");
        }

        syncChats(data.users);

    } catch (error) {
        console.error("Users API error:", error);
    } finally {
        isFetching = false;
    }
}

// Search users
searchBar.onkeyup = () => {
    const searchTerm = searchBar.value.trim();

    if (searchTerm !== "") {
        searchBar.classList.add("active");
    } else {
        searchBar.classList.remove("active");

        // Restore cached chats without fetching or recreating them
        usersList.replaceChildren();
        reorderChats(chats);
        fetchUsers();

        return;
    }

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "php/search.php", true);

    xhr.onload = () => {
        if (xhr.status === 200) {
            usersList.innerHTML = xhr.response;
        }
    };

    xhr.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded"
    );

    xhr.send("searchTerm=" + encodeURIComponent(searchTerm));
};

// Initial fetch
fetchUsers();

// Poll every 500ms
setInterval(fetchUsers, 500);
=======

const searchBar = document.querySelector(".search input");
const searchIcon = document.querySelector(".search button");
const usersList = document.querySelector(".users-list");

// Persistent chat storage
let chats = [];
const chatElements = new Map();

let isFetching = false;

// Search button
searchIcon.onclick = () => {
    searchBar.classList.toggle("show");
    searchIcon.classList.toggle("active");
    searchBar.focus();

    if (searchBar.classList.contains("active")) {
        searchBar.value = "";
        searchBar.classList.remove("active");
        fetchUsers();
    }
};

// Create a chat element only once
function createChat(user) {
    const link = document.createElement("a");
    link.href = `chat.php?user_id=${encodeURIComponent(user.unique_id)}`;

    const content = document.createElement("div");
    content.className = "content";

    const image = document.createElement("img");
    image.alt = user.full_name;

    const details = document.createElement("div");
    details.className = "details";

    const name = document.createElement("span");
    const message = document.createElement("p");

    details.append(name, message);
    content.append(image, details);

    const status = document.createElement("div");
    status.className = "status-dot";

    const circle = document.createElement("i");
    circle.className = "fas fa-circle";

    status.appendChild(circle);

    link.append(content, status);

    return {
        element: link,
        image,
        name,
        message,
        status
    };
}

// Update existing chat without recreating its DOM
function updateChat(user, chat) {
    const { image, name, message, status } = chat;

    const imageSrc = `php/images/${encodeURIComponent(user.img)}`;

    if (image.src !== new URL(imageSrc, document.baseURI).href) {
        image.src = imageSrc;
    }

    if (image.alt !== user.full_name) {
        image.alt = user.full_name;
    }

    if (name.textContent !== user.full_name) {
        name.textContent = user.full_name;
    }

    const lastMessage =
        (user.is_sender ? "You: " : "") + user.last_message;

    if (message.textContent !== lastMessage) {
        message.textContent = lastMessage;
    }

    const offline = !user.online;

    if (status.classList.contains("offline") !== offline) {
        status.classList.toggle("offline", offline);
    }
}

// Synchronize chat order without recreating elements
function reorderChats(users) {
    const orderedIds = users.map(user => String(user.unique_id));

    // Keep previously loaded chats that are absent from this response
    chatElements.forEach((chat, id) => {
        if (!orderedIds.includes(id)) {
            orderedIds.push(id);
        }
    });

    const currentElements = Array.from(usersList.children);

    orderedIds.forEach((id, index) => {
        const chat = chatElements.get(id);

        if (!chat) return;

        const currentElement = usersList.children[index];

        // Move only when the position is different
        if (currentElement !== chat.element) {
            usersList.insertBefore(
                chat.element,
                currentElement || null
            );
        }
    });
}

// Process new API response
function syncChats(users) {
    // Store latest response in the persistent array
    chats = users;

    chats.forEach(user => {
        const id = String(user.unique_id);

        let chat = chatElements.get(id);

        // Create only new chats
        if (!chat) {
            chat = createChat(user);
            chatElements.set(id, chat);
        }

        // Update data without replacing DOM
        updateChat(user, chat);
    });

    // Change order according to API response
    reorderChats(chats);
}

// Fetch users JSON
async function fetchUsers() {
    if (isFetching) return;
    if (searchBar.classList.contains("active")) return;

    isFetching = true;

    try {
        const response = await fetch("php/users.php");

        if (response.status === 401) {
            window.location.href = "login.php";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to fetch users");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Request failed");
        }

        syncChats(data.users);

    } catch (error) {
        console.error("Users API error:", error);
    } finally {
        isFetching = false;
    }
}

// Search users
searchBar.onkeyup = () => {
    const searchTerm = searchBar.value.trim();

    if (searchTerm !== "") {
        searchBar.classList.add("active");
    } else {
        searchBar.classList.remove("active");

        // Restore cached chats without fetching or recreating them
        usersList.replaceChildren();
        reorderChats(chats);
        fetchUsers();

        return;
    }

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "php/search.php", true);

    xhr.onload = () => {
        if (xhr.status === 200) {
            usersList.innerHTML = xhr.response;
        }
    };

    xhr.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded"
    );

    xhr.send("searchTerm=" + encodeURIComponent(searchTerm));
};

// Initial fetch
fetchUsers();

// Poll every 500ms
setInterval(fetchUsers, 500);
>>>>>>> origin/main
