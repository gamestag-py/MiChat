<<<<<<< HEAD

document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("editProfileBtn");
    const modal = document.getElementById("profileModal");
    const closeBtn = document.getElementById("closeProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");
    const overlay = document.getElementById("closeProfileModal");

    const form = document.getElementById("profileForm");
    const fnameInput = document.getElementById("profileFname");
    const lnameInput = document.getElementById("profileLname");
    const bioInput = document.getElementById("profileBio");

    const imageInput = document.getElementById("profileImageInput");
    const previewImage = document.getElementById("previewProfileImage");

    const profileName = document.getElementById("myProfileName");
    const profileBio = document.getElementById("myProfileBio");
    const profileImage = document.getElementById("myProfileImage");

    const bioCharCount = document.getElementById("bioCharCount");
    const errorBox = document.getElementById("profileError");
    const saveBtn = document.getElementById("saveProfileBtn");

    if (!modal || !form) {
        console.error("Profile elements not found.");
        return;
    }

    const API_URL = "php/update-profile.php";

    let originalImage = previewImage?.src || "";

    // -----------------------------
    // MODAL
    // -----------------------------

    function openModal() {
        errorBox.textContent = "";

        if (profileName && fnameInput && lnameInput) {
            const nameParts = profileName.textContent.trim().split(/\s+/);

            fnameInput.value = nameParts.shift() || "";
            lnameInput.value = nameParts.join(" ");
        }

        if (profileBio && bioInput) {
            const bio = profileBio.textContent.trim();

            bioInput.value =
                bio === "No bio added yet." ? "" : bio;
        }

        if (profileImage && previewImage) {
            previewImage.src = profileImage.src;
            originalImage = profileImage.src;
        }

        updateBioCount();

        modal.classList.add("active");
        document.body.classList.add("modal-open");

        fnameInput?.focus();
    }

    function closeModal() {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");

        errorBox.textContent = "";
        imageInput.value = "";

        if (previewImage) {
            previewImage.src = originalImage;
        }
    }

    editBtn?.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    overlay?.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("active")
        ) {
            closeModal();
        }
    });

    // -----------------------------
    // BIO CHARACTER COUNTER
    // -----------------------------

    function updateBioCount() {
        if (!bioInput || !bioCharCount) return;

        const length = bioInput.value.length;

        bioCharCount.textContent = `${length}/300`;
    }

    bioInput?.addEventListener("input", updateBioCount);

    updateBioCount();

    // -----------------------------
    // IMAGE PREVIEW
    // -----------------------------

    imageInput?.addEventListener("change", () => {
        const file = imageInput.files[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showError("Please select a valid JPG, PNG, GIF or WEBP image.");
            imageInput.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showError("Image size must be less than 5 MB.");
            imageInput.value = "";
            return;
        }

        errorBox.textContent = "";

        const reader = new FileReader();

        reader.onload = (event) => {
            previewImage.src = event.target.result;
        };

        reader.onerror = () => {
            showError("Unable to preview this image.");
        };

        reader.readAsDataURL(file);
    });

    // -----------------------------
    // ERROR HANDLING
    // -----------------------------

    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = "block";
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }

    // -----------------------------
    // UPDATE PROFILE UI
    // -----------------------------

    function updateProfileUI(data) {
        const fullName = `${data.fname} ${data.lname}`.trim();

        if (profileName) {
            profileName.textContent = fullName;
        }

        if (profileBio) {
            profileBio.textContent =
                data.bio?.trim() || "No bio added yet.";
        }

        if (data.img) {
            const imageURL = `php/images/${encodeURIComponent(data.img)}`;

            if (profileImage) {
                profileImage.src = imageURL;
            }

            if (previewImage) {
                previewImage.src = imageURL;
            }

            document.querySelectorAll(".nav-avatar").forEach((img) => {
                img.src = imageURL;
            });
        }
    }

    // -----------------------------
    // SAVE PROFILE
    // -----------------------------

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearError();

        const fname = fnameInput.value.trim();
        const lname = lnameInput.value.trim();
        const bio = bioInput.value.trim();

        if (!fname || !lname) {
            showError("First name and last name are required.");
            return;
        }

        if (fname.length > 50 || lname.length > 50) {
            showError("Names cannot exceed 50 characters.");
            return;
        }

        if (bio.length > 300) {
            showError("Bio cannot exceed 300 characters.");
            return;
        }

        const formData = new FormData(form);

        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Saving...
        `;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
                credentials: "same-origin"
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to update profile."
                );
            }

            updateProfileUI({
                fname: data.fname ?? fname,
                lname: data.lname ?? lname,
                bio: data.bio ?? bio,
                img: data.img
            });

            originalImage = previewImage?.src || originalImage;

            closeModal();

        } catch (error) {
            console.error("Profile update error:", error);

            showError(
                error.message || "Something went wrong. Please try again."
            );

        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <i class="fas fa-check"></i>
                Save changes
            `;
        }
    });
});
=======

document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("editProfileBtn");
    const modal = document.getElementById("profileModal");
    const closeBtn = document.getElementById("closeProfileBtn");
    const cancelBtn = document.getElementById("cancelProfileBtn");
    const overlay = document.getElementById("closeProfileModal");

    const form = document.getElementById("profileForm");
    const fnameInput = document.getElementById("profileFname");
    const lnameInput = document.getElementById("profileLname");
    const bioInput = document.getElementById("profileBio");

    const imageInput = document.getElementById("profileImageInput");
    const previewImage = document.getElementById("previewProfileImage");

    const profileName = document.getElementById("myProfileName");
    const profileBio = document.getElementById("myProfileBio");
    const profileImage = document.getElementById("myProfileImage");

    const bioCharCount = document.getElementById("bioCharCount");
    const errorBox = document.getElementById("profileError");
    const saveBtn = document.getElementById("saveProfileBtn");

    if (!modal || !form) {
        console.error("Profile elements not found.");
        return;
    }

    const API_URL = "php/update-profile.php";

    let originalImage = previewImage?.src || "";

    // -----------------------------
    // MODAL
    // -----------------------------

    function openModal() {
        errorBox.textContent = "";

        if (profileName && fnameInput && lnameInput) {
            const nameParts = profileName.textContent.trim().split(/\s+/);

            fnameInput.value = nameParts.shift() || "";
            lnameInput.value = nameParts.join(" ");
        }

        if (profileBio && bioInput) {
            const bio = profileBio.textContent.trim();

            bioInput.value =
                bio === "No bio added yet." ? "" : bio;
        }

        if (profileImage && previewImage) {
            previewImage.src = profileImage.src;
            originalImage = profileImage.src;
        }

        updateBioCount();

        modal.classList.add("active");
        document.body.classList.add("modal-open");

        fnameInput?.focus();
    }

    function closeModal() {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");

        errorBox.textContent = "";
        imageInput.value = "";

        if (previewImage) {
            previewImage.src = originalImage;
        }
    }

    editBtn?.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    overlay?.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("active")
        ) {
            closeModal();
        }
    });

    // -----------------------------
    // BIO CHARACTER COUNTER
    // -----------------------------

    function updateBioCount() {
        if (!bioInput || !bioCharCount) return;

        const length = bioInput.value.length;

        bioCharCount.textContent = `${length}/300`;
    }

    bioInput?.addEventListener("input", updateBioCount);

    updateBioCount();

    // -----------------------------
    // IMAGE PREVIEW
    // -----------------------------

    imageInput?.addEventListener("change", () => {
        const file = imageInput.files[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showError("Please select a valid JPG, PNG, GIF or WEBP image.");
            imageInput.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showError("Image size must be less than 5 MB.");
            imageInput.value = "";
            return;
        }

        errorBox.textContent = "";

        const reader = new FileReader();

        reader.onload = (event) => {
            previewImage.src = event.target.result;
        };

        reader.onerror = () => {
            showError("Unable to preview this image.");
        };

        reader.readAsDataURL(file);
    });

    // -----------------------------
    // ERROR HANDLING
    // -----------------------------

    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = "block";
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }

    // -----------------------------
    // UPDATE PROFILE UI
    // -----------------------------

    function updateProfileUI(data) {
        const fullName = `${data.fname} ${data.lname}`.trim();

        if (profileName) {
            profileName.textContent = fullName;
        }

        if (profileBio) {
            profileBio.textContent =
                data.bio?.trim() || "No bio added yet.";
        }

        if (data.img) {
            const imageURL = `php/images/${encodeURIComponent(data.img)}`;

            if (profileImage) {
                profileImage.src = imageURL;
            }

            if (previewImage) {
                previewImage.src = imageURL;
            }

            document.querySelectorAll(".nav-avatar").forEach((img) => {
                img.src = imageURL;
            });
        }
    }

    // -----------------------------
    // SAVE PROFILE
    // -----------------------------

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearError();

        const fname = fnameInput.value.trim();
        const lname = lnameInput.value.trim();
        const bio = bioInput.value.trim();

        if (!fname || !lname) {
            showError("First name and last name are required.");
            return;
        }

        if (fname.length > 50 || lname.length > 50) {
            showError("Names cannot exceed 50 characters.");
            return;
        }

        if (bio.length > 300) {
            showError("Bio cannot exceed 300 characters.");
            return;
        }

        const formData = new FormData(form);

        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Saving...
        `;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
                credentials: "same-origin"
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to update profile."
                );
            }

            updateProfileUI({
                fname: data.fname ?? fname,
                lname: data.lname ?? lname,
                bio: data.bio ?? bio,
                img: data.img
            });

            originalImage = previewImage?.src || originalImage;

            closeModal();

        } catch (error) {
            console.error("Profile update error:", error);

            showError(
                error.message || "Something went wrong. Please try again."
            );

        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <i class="fas fa-check"></i>
                Save changes
            `;
        }
    });
});
>>>>>>> origin/main
