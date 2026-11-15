async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 3072,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );

    const publicKey = await crypto.subtle.exportKey(
        "jwk",
        keyPair.publicKey
    );

    const privateKey = await crypto.subtle.exportKey(
        "jwk",
        keyPair.privateKey
    );

    publicKey.alg = "RSA-OAEP-256";
    return {
        publicKey,
        privateKey
    };
}



function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(i, i + chunkSize)
        );
    }

    return btoa(binary);
}

function base64ToBytes(base64) {
    return Uint8Array.from(
        atob(base64),
        char => char.charCodeAt(0)
    );
}

async function importPublicKey(jwk) {
    return await crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["encrypt"]
    );
}

async function importPrivateKey(jwk) {
    return await crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["decrypt"]
    );
}

// Encrypt message for BOTH sender and recipient
async function encryptChatMessage(
    message,
    senderPublicJWK,
    recipientPublicJWK
) {
    const senderPublicKey = await importPublicKey(senderPublicJWK);
    const recipientPublicKey = await importPublicKey(recipientPublicJWK);

    // Generate AES-256 key
    const aesKey = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt plaintext
    const encryptedMessage = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        new TextEncoder().encode(message)
    );

    // Export AES key
    const rawAESKey = await crypto.subtle.exportKey(
        "raw",
        aesKey
    );

    // Encrypt AES key for sender
    const encryptedKeySender = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        senderPublicKey,
        rawAESKey
    );

    // Encrypt AES key for recipient
    const encryptedKeyRecipient = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        rawAESKey
    );

    return {
        encrypted_msg: bytesToBase64(
            new Uint8Array(encryptedMessage)
        ),

        encrypted_key_sender: bytesToBase64(
            new Uint8Array(encryptedKeySender)
        ),

        encrypted_key_recipient: bytesToBase64(
            new Uint8Array(encryptedKeyRecipient)
        ),

        iv: bytesToBase64(iv)
    };
}

// Decrypt message using current user's private key
async function decryptChatMessage(
    encryptedData,
    privateKeyJWK,
    isSender
) {
    const privateKey = await importPrivateKey(privateKeyJWK);

    // Select AES key encrypted for current user
    const encryptedAESKey = base64ToBytes(
        isSender
            ? encryptedData.encrypted_key_sender
            : encryptedData.encrypted_key_recipient
    );

    // Decrypt AES key
    const rawAESKey = await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        encryptedAESKey
    );

    // Import AES key
    const aesKey = await crypto.subtle.importKey(
        "raw",
        rawAESKey,
        {
            name: "AES-GCM"
        },
        false,
        ["decrypt"]
    );

    // Decrypt message
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToBytes(encryptedData.iv)
        },
        aesKey,
        base64ToBytes(encryptedData.encrypted_msg)
    );

    return new TextDecoder().decode(decrypted);
}
