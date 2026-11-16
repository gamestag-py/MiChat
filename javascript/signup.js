
const form = document.querySelector(".signup form");
const continueBtn = form.querySelector(".button input");
const errorText = form.querySelector(".error-text");

form.onsubmit = async (e) => {
    e.preventDefault();

    continueBtn.disabled = true;
    continueBtn.value = "Creating account...";
    errorText.style.display = "none";

    try {
        // Step 1: Register user
        const xhr = new XMLHttpRequest();

        const registration = await new Promise((resolve, reject) => {
            xhr.open("POST", "php/signup.php", true);

            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(xhr.response.trim());
                } else {
                    reject(new Error("Registration request failed"));
                }
            };

            xhr.onerror = () => reject(
                new Error("Network error during registration")
            );

            xhr.send(new FormData(form));
        });

        if (registration !== "success") {
            throw new Error(registration);
        }

        console.log("Registration successful!");

        // Step 2: Generate RSA key pair
        continueBtn.value = "Generating encryption keys...";

        const keys = await generateKeyPair();

        console.log("PUBLIC KEY:", keys.publicKey);
        console.log("PRIVATE KEY:", keys.privateKey);

        // Step 3: Save keys locally
        localStorage.setItem(
            "michat_public_key",
            JSON.stringify(keys.publicKey)
        );

        localStorage.setItem(
            "michat_private_key",
            JSON.stringify(keys.privateKey)
        );

        console.log("Keys saved locally!");

        // Step 4: Upload public key to backend
        continueBtn.value = "Saving public key...";

        const response = await fetch("php/save_public_key.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                public_key: keys.publicKey
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to save public key"
            );
        }

        console.log("Public key saved to database!");
        console.log("Public key ID:", result.key_id);

        // Step 5: Redirect
        continueBtn.value = "Registration successful!";

        location.href = "users.php";

    } catch (error) {
        console.error("Signup error:", error);

        errorText.style.display = "block";
        errorText.textContent = error.message;

        continueBtn.disabled = false;
        continueBtn.value = "Continue to Chat";
    }
};
