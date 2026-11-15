<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings | MiChat</title>

    <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <style>
        :root {
            --bg: #111318;
            --surface: #191c23;
            --surface2: #20242d;
            --border: #2c303a;
            --text: #f1f2f5;
            --muted: #9299a8;
            --primary: #6c8cff;
            --danger: #ef5350;
            --success: #35c98a;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: Arial, sans-serif;
            min-height: 100vh;
        }

        button,
        input {
            font: inherit;
        }

        .settings-layout {
            max-width: 1050px;
            margin: auto;
            padding: 35px 22px;
        }

        .settings-header {
            margin-bottom: 30px;
        }

        .settings-header h1 {
            font-size: 26px;
            margin-bottom: 9px;
        }

        .settings-header p {
            color: var(--muted);
            font-size: 14px;
        }

        .settings-grid {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 24px;
            align-items: start;
        }

        .settings-sidebar,
        .settings-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 13px;
        }

        .settings-sidebar {
            padding: 12px;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 13px;
            border-radius: 8px;
            color: var(--muted);
            font-size: 14px;
            text-decoration: none;
        }

        .sidebar-item.active {
            background: var(--surface2);
            color: var(--text);
        }

        .sidebar-item i {
            width: 18px;
        }

        .settings-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .settings-card {
            padding: 24px;
        }

        .card-heading {
            display: flex;
            align-items: center;
            gap: 13px;
            margin-bottom: 22px;
        }

        .card-icon {
            width: 42px;
            height: 42px;
            background: var(--surface2);
            border-radius: 10px;
            display: grid;
            place-items: center;
            color: var(--primary);
            font-size: 17px;
        }

        .card-heading h2 {
            font-size: 17px;
            margin-bottom: 5px;
        }

        .card-heading p {
            color: var(--muted);
            font-size: 12px;
        }

        .form-group {
            margin-bottom: 18px;
        }

        .form-group label {
            display: block;
            margin-bottom: 9px;
            font-size: 13px;
            font-weight: 600;
        }

        .input-wrap {
            position: relative;
        }

        .input-wrap input {
            width: 100%;
            height: 46px;
            padding: 0 45px 0 14px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface2);
            color: var(--text);
            outline: none;
            transition: border .2s;
        }

        .input-wrap input:focus {
            border-color: var(--primary);
        }

        .input-wrap input::placeholder {
            color: #707786;
        }

        .password-toggle {
            position: absolute;
            right: 13px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--muted);
            cursor: pointer;
        }

        .primary-btn {
            height: 43px;
            padding: 0 20px;
            border: none;
            border-radius: 8px;
            background: var(--primary);
            color: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity .2s;
        }

        .primary-btn:hover {
            opacity: .85;
        }

        .primary-btn:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        .security-warning {
            display: flex;
            gap: 12px;
            padding: 14px;
            background: rgba(239, 83, 80, .08);
            border: 1px solid rgba(239, 83, 80, .2);
            border-radius: 9px;
            margin-bottom: 20px;
            color: #e9a3a1;
            font-size: 12px;
            line-height: 1.6;
        }

        .security-warning i {
            margin-top: 2px;
            color: var(--danger);
        }

        .key-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 9px;
            margin-bottom: 17px;
            gap: 12px;
        }

        .key-info strong {
            font-size: 13px;
        }

        .key-info p {
            color: var(--muted);
            font-size: 12px;
            margin-top: 5px;
        }

        .key-status {
            color: var(--success);
            font-size: 12px;
            white-space: nowrap;
        }

        .key-status.missing {
            color: var(--danger);
        }

        .export-btn {
            background: var(--surface2);
            border: 1px solid var(--border);
            color: var(--text);
            height: 44px;
            padding: 0 17px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        }

        .export-btn:hover {
            border-color: var(--primary);
        }

        .export-btn i {
            margin-right: 8px;
            color: var(--primary);
        }

        .form-message {
            display: none;
            margin-bottom: 17px;
            padding: 11px 13px;
            border-radius: 7px;
            font-size: 13px;
        }

        .form-message.success {
            display: block;
            background: rgba(53, 201, 138, .1);
            color: var(--success);
        }

        .form-message.error {
            display: block;
            background: rgba(239, 83, 80, .1);
            color: #ff7777;
        }

        @media(max-width: 700px) {
            .settings-grid {
                grid-template-columns: 1fr;
            }

            .settings-sidebar {
                display: flex;
                overflow-x: auto;
            }

            .sidebar-item {
                white-space: nowrap;
            }

            .settings-layout {
                padding: 23px 14px;
            }

            .settings-card {
                padding: 19px;
            }
        }
    </style>
</head>

<body>

    <div class="settings-layout">

        <div class="settings-header">
            <h1>Settings</h1>
            <p>Manage your account and encryption preferences.</p>
        </div>

        <div class="settings-grid">

            <!-- SIDEBAR -->
            <aside class="settings-sidebar">

                <a href="#account" class="sidebar-item active">
                    <i class="fas fa-user-cog"></i>
                    Account
                </a>

                <a href="#security" class="sidebar-item">
                    <i class="fas fa-shield-alt"></i>
                    Security
                </a>

                <a href="#encryption" class="sidebar-item">
                    <i class="fas fa-key"></i>
                    Encryption
                </a>

            </aside>

            <main class="settings-content">

                <!-- CHANGE PASSWORD -->
                <section class="settings-card" id="account">

                    <div class="card-heading">
                        <div class="card-icon">
                            <i class="fas fa-lock"></i>
                        </div>

                        <div>
                            <h2>Change Password</h2>
                            <p>Update your MiChat account password.</p>
                        </div>
                    </div>

                    <div id="passwordMessage" class="form-message"></div>

                    <form id="passwordForm">

                        <div class="form-group">
                            <label>Current Password</label>

                            <div class="input-wrap">
                                <input
                                    type="password"
                                    name="current_password"
                                    placeholder="Enter current password"
                                    autocomplete="current-password"
                                    required>

                                <button type="button" class="password-toggle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>New Password</label>

                            <div class="input-wrap">
                                <input
                                    type="password"
                                    name="new_password"
                                    placeholder="Enter new password"
                                    minlength="8"
                                    autocomplete="new-password"
                                    required>

                                <button type="button" class="password-toggle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Confirm New Password</label>

                            <div class="input-wrap">
                                <input
                                    type="password"
                                    name="confirm_password"
                                    placeholder="Confirm new password"
                                    minlength="8"
                                    autocomplete="new-password"
                                    required>

                                <button type="button" class="password-toggle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="primary-btn" id="changePasswordBtn">
                            Update Password
                        </button>

                    </form>

                </section>


                <!-- ENCRYPTION KEYS -->
                <section class="settings-card" id="encryption">

                    <div class="card-heading">
                        <div class="card-icon">
                            <i class="fas fa-key"></i>
                        </div>

                        <div>
                            <h2>Encryption Keys</h2>
                            <p>Manage your end-to-end encryption keys.</p>
                        </div>
                    </div>

                    <div class="security-warning">
                        <i class="fas fa-exclamation-triangle"></i>

                        <div>
                            <strong>Keep your private key secure.</strong>
                            Anyone with access to your private key may be able
                            to decrypt your messages. Never share this file.
                        </div>
                    </div>

                    <div class="key-info">

                        <div>
                            <strong>Public Key</strong>
                            <p>Used by other users to encrypt messages for you.</p>
                        </div>

                        <span class="key-status" id="publicKeyStatus">
                            Checking...
                        </span>

                    </div>

                    <div class="key-info">

                        <div>
                            <strong>Private Key</strong>
                            <p>Required to decrypt your received messages.</p>
                        </div>

                        <span class="key-status" id="privateKeyStatus">
                            Checking...
                        </span>

                    </div>

                    <button type="button" class="export-btn" id="exportKeysBtn">
                        <i class="fas fa-download"></i>
                        Export Encryption Keys
                    </button>

                    <div style="margin-top: 15px;">

                        <input
                            type="file"
                            id="importKeysFile"
                            accept=".txt,text/plain"
                            hidden>

                        <button
                            type="button"
                            class="export-btn"
                            id="importKeysBtn">
                            <i class="fas fa-file-import"></i>
                            Import Encryption Keys
                        </button>

                        <p style="color: var(--muted); font-size: 12px; margin-top: 10px;">
                            Restore your encryption keys from a previously exported MiChat backup.
                        </p>

                        <div id="importKeysMessage" class="form-message"></div>

                    </div>

                </section>

                <!-- SECURITY -->
                <section class="settings-card" id="security">

                    <div class="card-heading">
                        <div class="card-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>

                        <div>
                            <h2>Security</h2>
                            <p>Protect your account and encrypted conversations.</p>
                        </div>
                    </div>

                    <div class="key-info">
                        <div>
                            <strong>End-to-End Encryption</strong>
                            <p>Your messages are encrypted before leaving your device.</p>
                        </div>

                        <span class="key-status">
                            <i class="fas fa-check-circle"></i> Enabled
                        </span>
                    </div>

                    <div class="key-info">
                        <div>
                            <strong>Private Key Storage</strong>
                            <p>Your local browser encryption key storage.</p>
                        </div>

                        <span class="key-status" id="localKeyStatus">
                            Checking...
                        </span>
                    </div>

                </section>

            </main>

        </div>
    </div>


    <script>
        // =====================================
        // PASSWORD VISIBILITY
        // =====================================

        document.querySelectorAll(".password-toggle").forEach(button => {

            button.addEventListener("click", () => {

                const input = button.parentElement.querySelector("input");

                input.type = input.type === "password" ?
                    "text" :
                    "password";

                button.innerHTML = input.type === "password" ?
                    '<i class="fas fa-eye"></i>' :
                    '<i class="fas fa-eye-slash"></i>';

            });

        });


        // =====================================
        // CHECK LOCAL ENCRYPTION KEYS
        // =====================================

        function checkEncryptionKeys() {

            const publicKey = localStorage.getItem("michat_public_key");
            const privateKey = localStorage.getItem("michat_private_key");

            const publicStatus = document.getElementById("publicKeyStatus");
            const privateStatus = document.getElementById("privateKeyStatus");
            const localStatus = document.getElementById("localKeyStatus");

            publicStatus.textContent = publicKey ? "Available" : "Not found";
            privateStatus.textContent = privateKey ? "Available" : "Not found";

            publicStatus.classList.toggle("missing", !publicKey);
            privateStatus.classList.toggle("missing", !privateKey);

            localStatus.textContent =
                publicKey && privateKey ? "Available" : "Incomplete";

            localStatus.classList.toggle(
                "missing",
                !(publicKey && privateKey)
            );

        }

        checkEncryptionKeys();


        // =====================================
        // EXPORT ENCRYPTION KEYS
        // =====================================

        document.getElementById("exportKeysBtn").addEventListener("click", () => {

            const publicKey = localStorage.getItem("michat_public_key");
            const privateKey = localStorage.getItem("michat_private_key");

            if (!publicKey || !privateKey) {
                alert("Encryption keys were not found in this browser.");
                return;
            }

            const confirmed = confirm(
                "WARNING: Your private encryption key will be exported into a plain text file.\n\nAnyone with this file may be able to decrypt your messages.\n\nContinue?"
            );

            if (!confirmed) return;

            const exportData = `
========================================
             MICHAT KEY BACKUP
========================================

IMPORTANT:
Keep this file private and secure.
Anyone with access to your private key
may be able to decrypt your messages.

----------------------------------------
PUBLIC KEY
----------------------------------------

${publicKey}


----------------------------------------
PRIVATE KEY
----------------------------------------

${privateKey}


========================================
              END OF BACKUP
========================================
`;

            const blob = new Blob(
                [exportData], {
                    type: "text/plain;charset=utf-8"
                }
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;
            link.download = "MiChat_Encryption_Keys.txt";

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        });


        // =====================================
        // CHANGE PASSWORD
        // =====================================

        document.getElementById("passwordForm").addEventListener("submit", async (event) => {

            event.preventDefault();

            const form = event.target;
            const message = document.getElementById("passwordMessage");
            const button = document.getElementById("changePasswordBtn");

            const currentPassword = form.current_password.value;
            const newPassword = form.new_password.value;
            const confirmPassword = form.confirm_password.value;

            message.className = "form-message";
            message.textContent = "";

            if (newPassword !== confirmPassword) {
                message.textContent = "New passwords do not match.";
                message.classList.add("error");
                return;
            }

            if (newPassword.length < 8) {
                message.textContent = "Password must contain at least 8 characters.";
                message.classList.add("error");
                return;
            }

            button.disabled = true;
            button.textContent = "Updating...";

            try {

                const response = await fetch("php/change-password.php", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to update password.");
                }

                message.textContent = data.message || "Password updated successfully.";
                message.classList.add("success");

                form.reset();

            } catch (error) {

                message.textContent = error.message;
                message.classList.add("error");

            } finally {

                button.disabled = false;
                button.textContent = "Update Password";

            }

        });


        // =====================================
        // SIDEBAR ACTIVE STATE
        // =====================================

        document.querySelectorAll(".sidebar-item").forEach(item => {

            item.addEventListener("click", () => {

                document.querySelectorAll(".sidebar-item").forEach(link => {
                    link.classList.remove("active");
                });

                item.classList.add("active");

            });

        });

        // =====================================
        // IMPORT ENCRYPTION KEYS
        // =====================================

        const importKeysBtn = document.getElementById("importKeysBtn");
        const importKeysFile = document.getElementById("importKeysFile");
        const importKeysMessage = document.getElementById("importKeysMessage");

        importKeysBtn.addEventListener("click", () => {
            importKeysFile.click();
        });

        importKeysFile.addEventListener("change", async () => {

            const file = importKeysFile.files[0];

            if (!file) return;

            importKeysMessage.className = "form-message";
            importKeysMessage.textContent = "";

            try {

                if (!file.name.toLowerCase().endsWith(".txt")) {
                    throw new Error("Please select a valid MiChat backup TXT file.");
                }

                if (file.size > 1024 * 1024) {
                    throw new Error("Backup file is too large.");
                }

                const content = await file.text();

                // Extract keys from exported backup.
                const publicMatch = content.match(
                    /PUBLIC KEY\s*-+\s*([\s\S]*?)\s*-+\s*PRIVATE KEY/
                );

                const privateMatch = content.match(
                    /PRIVATE KEY\s*-+\s*([\s\S]*?)\s*=+/
                );

                if (!publicMatch || !privateMatch) {
                    throw new Error("Invalid MiChat encryption backup format.");
                }

                const publicKey = publicMatch[1].trim();
                const privateKey = privateMatch[1].trim();

                if (!publicKey || !privateKey) {
                    throw new Error("Public or private key is missing.");
                }

                // Check whether keys already exist.
                const existingPublicKey =
                    localStorage.getItem("michat_public_key");

                const existingPrivateKey =
                    localStorage.getItem("michat_private_key");

                if (existingPublicKey || existingPrivateKey) {

                    const confirmed = confirm(
                        "Encryption keys already exist in this browser.\n\n" +
                        "Importing will replace your existing keys.\n\n" +
                        "Continue?"
                    );

                    if (!confirmed) return;
                }

                // Save both keys.
                localStorage.setItem("michat_public_key", publicKey);
                localStorage.setItem("michat_private_key", privateKey);

                // Update key availability indicators.
                checkEncryptionKeys();

                importKeysMessage.textContent =
                    "Encryption keys imported successfully.";

                importKeysMessage.className = "form-message success";

                alert("MiChat encryption keys restored successfully.");

            } catch (error) {

                console.error("Key import error:", error);

                importKeysMessage.textContent = error.message;
                importKeysMessage.className = "form-message error";

            } finally {

                importKeysFile.value = "";

            }

        });
    </script>

</body>

</html>