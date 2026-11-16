
// =====================================
// OTHER USER PROFILE POPUP
// =====================================

function closeOtherUserProfile() {
    const popup = document.getElementById("otherUserPopup");

    if (popup) {
        popup.classList.remove("active");
    }

    document.body.style.overflow = "";
}

function openOtherUserProfile(trigger) {
    const popup = document.getElementById("otherUserPopup");

    if (!popup || !trigger) return;

    const data = trigger.dataset;

    document.getElementById("otherUserPopupImage").src =
        data.img
            ? `php/images/${encodeURIComponent(data.img)}`
            : "php/images/default.png";

    document.getElementById("otherUserPopupName").textContent =
        `${data.fname || ""} ${data.lname || ""}`.trim();

    document.getElementById("otherUserPopupStatus").textContent =
        data.status || "Offline";

    document.getElementById("otherUserPopupBio").textContent =
        data.bio || "No bio added yet.";

    document.getElementById("otherUserPopupId").textContent =
        data.userId || data.userId || data.userId || data.userId || "-";

    const isActive = (data.status || "").toLowerCase() === "active";

    document.getElementById("otherUserPopupStatusDot").style.background =
        isActive ? "#35c98a" : "#8490a1";

    const blockButton = document.getElementById("blockUserBtn");

    if (blockButton) {
        const isBlocked = data.blocked === "true";

        blockButton.dataset.userId = data.userId;
        blockButton.dataset.blocked = String(isBlocked);
        blockButton.disabled = false;

        blockButton.innerHTML = isBlocked
            ? `<i class="fas fa-unlock"></i> Unblock User`
            : `<i class="fas fa-ban"></i> Block User`;
    }

    popup.classList.add("active");
    document.body.style.overflow = "hidden";
}


// Delegated click handlers work with dynamically loaded chat fragments.
document.addEventListener("click", async (event) => {

    const profileTrigger = event.target.closest(".chat-profile-trigger");

    if (profileTrigger) {
        openOtherUserProfile(profileTrigger);
        return;
    }

    if (event.target.closest("[data-close-profile]")) {
        closeOtherUserProfile();
        return;
    }

    const blockButton = event.target.closest("#blockUserBtn");

    if (blockButton) {
        await blockOtherUser(blockButton);
    }
});


// Close popup using Escape.
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeOtherUserProfile();
    }
});



// =====================================
// BLOCK / UNBLOCK USER
// =====================================

async function blockOtherUser(button) {
    const userId = button.dataset.userId;

    if (!userId) return;

    const isCurrentlyBlocked =
        button.dataset.blocked === "true";

    const action = isCurrentlyBlocked ? "unblock" : "block";

    const confirmed = confirm(
        isCurrentlyBlocked
            ? "Are you sure you want to unblock this user?"
            : "Are you sure you want to block this user? They will no longer be able to communicate with you."
    );

    if (!confirmed) return;

    const originalHTML = button.innerHTML;

    button.disabled = true;
    button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        ${isCurrentlyBlocked ? "Unblocking..." : "Blocking..."}
    `;

    try {
        const response = await fetch("php/block-user.php", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to update block status.");
        }

        // Update button state.
        button.dataset.blocked = String(data.blocked);

        if (data.blocked) {
            window.location.href = "users.php";
        } else {
            location.reload();
        }

    } catch (error) {
        console.error("Block/unblock user error:", error);
        alert(error.message);

        button.innerHTML = originalHTML;
    } finally {
        button.disabled = false;
    }
}
