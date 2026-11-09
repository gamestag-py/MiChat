
const MiChatCrypto = {
    DB_NAME: "MiChatCryptoDB",
    DB_VERSION: 2,
    STORE_NAME: "keypairs",
    SESSION_STORE: "sessions",
    // Generate an ECDSA P-256 identity key pair.
    async generateIdentityKeyPair() {
        return crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            false,
            ["sign", "verify"]
        );
    },

    // Generate an ECDH P-256 prekey pair.
    async generatePrekeyPair() {
        return crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            false,
            ["deriveBits"]
        );
    },

    // Export only public keys.
    async exportPublicKey(key) {
        const raw = await crypto.subtle.exportKey("raw", key);
        return this.toHex(raw);
    },

    toHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    },

    fromHex(hex) {
        if (
            typeof hex !== "string" ||
            !/^(?:[0-9a-fA-F]{2})+$/.test(hex)
        ) {
            throw new Error("Invalid hexadecimal input");
        }

        return Uint8Array.from(
            hex.match(/.{2}/g),
            byte => parseInt(byte, 16)
        );
    },

    async signPrekey(identityPrivateKey, prekeyPublicKey) {
        const publicKeyBytes = await crypto.subtle.exportKey(
            "raw",
            prekeyPublicKey
        );

        const signature = await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: "SHA-256"
            },
            identityPrivateKey,
            publicKeyBytes
        );

        return this.toHex(signature);
    },

    async verifyPrekeySignature(
        identityPublicKeyHex,
        prekeyPublicKeyHex,
        signatureHex
    ) {
        const identityPublicKey = await crypto.subtle.importKey(
            "raw",
            this.fromHex(identityPublicKeyHex),
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            false,
            ["verify"]
        );

        return crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: "SHA-256"
            },
            identityPublicKey,
            this.fromHex(signatureHex),
            this.fromHex(prekeyPublicKeyHex)
        );
    },

    // Open or create the IndexedDB database.
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(
                this.DB_NAME,
                this.DB_VERSION
            );

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(this.STORE_NAME)) {
                    database.createObjectStore(this.STORE_NAME, {
                        keyPath: "name"
                    });
                }

                if (!database.objectStoreNames.contains(this.SESSION_STORE)) {
                    database.createObjectStore(this.SESSION_STORE, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    // Save CryptoKey objects without exporting private-key material.
    async saveKeyPair(name, keyPair) {
        if (!keyPair?.privateKey || !keyPair?.publicKey) {
            throw new Error("Invalid key pair");
        }

        if (keyPair.privateKey.extractable) {
            throw new Error("Private key must be non-extractable");
        }

        const publicKeyHex = await this.exportPublicKey(
            keyPair.publicKey
        );

        const database = await this.openDatabase();

        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.STORE_NAME,
                    "readwrite"
                );

                transaction.objectStore(this.STORE_NAME).put({
                    name,
                    publicKeyHex,
                    publicKey: keyPair.publicKey,
                    privateKey: keyPair.privateKey,
                    createdAt: new Date().toISOString()
                });

                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });

            return publicKeyHex;
        } finally {
            database.close();
        }
    },

    // Load a saved key pair.
    async loadKeyPair(name) {
        const database = await this.openDatabase();

        try {
            return await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.STORE_NAME,
                    "readonly"
                );

                const request = transaction
                    .objectStore(this.STORE_NAME)
                    .get(name);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } finally {
            database.close();
        }
    },

    // Delete a saved key pair.
    async deleteKeyPair(name) {
        const database = await this.openDatabase();

        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.STORE_NAME,
                    "readwrite"
                );

                transaction.objectStore(this.STORE_NAME).delete(name);

                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            database.close();
        }
    },


    // Derive an AES-256-GCM key using ECDH and HKDF-SHA-256.
    async deriveEncryptionKey(
        privateKey,
        peerPublicKeyHex,
        saltHex,
        context = "MiChat-v1"
    ) {
        const peerPublicKey = await crypto.subtle.importKey(
            "raw",
            this.fromHex(peerPublicKeyHex),
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            false,
            []
        );

        const sharedBits = await crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: peerPublicKey
            },
            privateKey,
            256
        );

        const hkdfKey = await crypto.subtle.importKey(
            "raw",
            sharedBits,
            "HKDF",
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: this.fromHex(saltHex),
                info: new TextEncoder().encode(context)
            },
            hkdfKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );
    },

    // Encrypt a message for another device.
    async encryptMessage(
        senderPrivateKey,
        recipientPublicKeyHex,
        plaintext,
        context = "MiChat-v1"
    ) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const nonce = crypto.getRandomValues(new Uint8Array(12));

        const saltHex = this.toHex(salt);

        const encryptionKey = await this.deriveEncryptionKey(
            senderPrivateKey,
            recipientPublicKeyHex,
            saltHex,
            context
        );

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: nonce,
                additionalData: new TextEncoder().encode(context),
                tagLength: 128
            },
            encryptionKey,
            new TextEncoder().encode(plaintext)
        );

        return {
            salt: saltHex,
            nonce: this.toHex(nonce),
            ciphertext: this.toHex(ciphertext)
        };
    },

    // Decrypt a message received from another device.
    async decryptMessage(
        recipientPrivateKey,
        senderPublicKeyHex,
        encryptedData,
        context = "MiChat-v1"
    ) {
        const encryptionKey = await this.deriveEncryptionKey(
            recipientPrivateKey,
            senderPublicKeyHex,
            encryptedData.salt,
            context
        );

        const plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: this.fromHex(encryptedData.nonce),
                additionalData: new TextEncoder().encode(context),
                tagLength: 128
            },
            encryptionKey,
            this.fromHex(encryptedData.ciphertext)
        );

        return new TextDecoder().decode(plaintext);
    },

    // Derive a session key from multiple ECDH shared secrets.
    async deriveSessionKey(sharedSecrets, saltHex, context = "MiChat-Handshake-v1") {
        const combined = new Uint8Array(
            sharedSecrets.reduce((total, secret) => total + secret.byteLength, 0)
        );

        let offset = 0;

        for (const secret of sharedSecrets) {
            combined.set(new Uint8Array(secret), offset);
            offset += secret.byteLength;
        }

        const material = await crypto.subtle.importKey(
            "raw",
            combined,
            "HKDF",
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: this.fromHex(saltHex),
                info: new TextEncoder().encode(context)
            },
            material,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );
    },

    // Initiator: derive using recipient's public prekeys.
    async createSessionKey(
        ephemeralPrivateKey,
        recipientSignedPrekeyHex,
        recipientOneTimePrekeyHex,
        saltHex,
        context
    ) {
        const signedPrekey = await crypto.subtle.importKey(
            "raw",
            this.fromHex(recipientSignedPrekeyHex),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );

        const secrets = [];

        secrets.push(await crypto.subtle.deriveBits(
            { name: "ECDH", public: signedPrekey },
            ephemeralPrivateKey,
            256
        ));

        if (recipientOneTimePrekeyHex) {
            const oneTimePrekey = await crypto.subtle.importKey(
                "raw",
                this.fromHex(recipientOneTimePrekeyHex),
                { name: "ECDH", namedCurve: "P-256" },
                false,
                []
            );

            secrets.push(await crypto.subtle.deriveBits(
                { name: "ECDH", public: oneTimePrekey },
                ephemeralPrivateKey,
                256
            ));
        }

        return this.deriveSessionKey(secrets, saltHex, context);
    },

    // Recipient: independently derive the same key.
    async acceptSessionKey(
        signedPrekeyPrivateKey,
        oneTimePrekeyPrivateKey,
        senderEphemeralPublicHex,
        saltHex,
        context
    ) {
        const ephemeralPublic = await crypto.subtle.importKey(
            "raw",
            this.fromHex(senderEphemeralPublicHex),
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );

        const secrets = [];

        secrets.push(await crypto.subtle.deriveBits(
            { name: "ECDH", public: ephemeralPublic },
            signedPrekeyPrivateKey,
            256
        ));

        if (oneTimePrekeyPrivateKey) {
            secrets.push(await crypto.subtle.deriveBits(
                { name: "ECDH", public: ephemeralPublic },
                oneTimePrekeyPrivateKey,
                256
            ));
        }

        return this.deriveSessionKey(secrets, saltHex, context);
    },

    async encryptWithSessionKey(key, plaintext, context = "MiChat-Message-v1") {
        const nonce = crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: nonce,
                additionalData: new TextEncoder().encode(context),
                tagLength: 128
            },
            key,
            new TextEncoder().encode(plaintext)
        );

        return {
            nonce: this.toHex(nonce),
            ciphertext: this.toHex(ciphertext)
        };
    },

    async decryptWithSessionKey(key, encryptedData, context = "MiChat-Message-v1") {
        const plaintext = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: this.fromHex(encryptedData.nonce),
                additionalData: new TextEncoder().encode(context),
                tagLength: 128
            },
            key,
            this.fromHex(encryptedData.ciphertext)
        );

        return new TextDecoder().decode(plaintext);
    },

    buildHandshakeContext({
        conversationId,
        senderDeviceId,
        recipientDeviceId,
        signedPrekeyId,
        oneTimePrekeyId = null
    }) {
        if (
            !conversationId ||
            !senderDeviceId ||
            !recipientDeviceId ||
            signedPrekeyId === undefined ||
            signedPrekeyId === null
        ) {
            throw new Error("Missing handshake context fields");
        }

        // Array order is fixed so both devices derive identical context.
        return JSON.stringify([
            "MiChat",
            1,
            conversationId,
            senderDeviceId,
            recipientDeviceId,
            signedPrekeyId,
            oneTimePrekeyId
        ]);
    },

    // Save an established session.
    async saveSession(session) {
        if (!session?.id || !session?.sessionKey) {
            throw new Error("Invalid session data");
        }

        if (session.sessionKey.extractable) {
            throw new Error("Session key must be non-extractable");
        }

        const database = await this.openDatabase();

        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.SESSION_STORE,
                    "readwrite"
                );

                transaction.objectStore(this.SESSION_STORE).put({
                    ...session,
                    updatedAt: new Date().toISOString()
                });

                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });

            return true;
        } finally {
            database.close();
        }
    },

    // Retrieve an established session.
    async loadSession(sessionId) {
        const database = await this.openDatabase();

        try {
            return await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.SESSION_STORE,
                    "readonly"
                );

                const request = transaction
                    .objectStore(this.SESSION_STORE)
                    .get(sessionId);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } finally {
            database.close();
        }
    },

    // Delete a session.
    async deleteSession(sessionId) {
        const database = await this.openDatabase();

        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(
                    this.SESSION_STORE,
                    "readwrite"
                );

                transaction.objectStore(this.SESSION_STORE).delete(sessionId);

                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });

            return true;
        } finally {
            database.close();
        }
    },

    // Retrieve a session using conversation and remote device IDs.
    async loadSessionForDevice(conversationId, remoteDeviceId) {
        if (!conversationId || !remoteDeviceId) {
            throw new Error("Conversation ID and remote device ID are required");
        }

        const sessionId = `${conversationId}:${remoteDeviceId}`;

        return this.loadSession(sessionId);
    },

    // Check whether a remote device identity matches the saved identity.
async verifyRemoteIdentity(
    conversationId,
    remoteDeviceId,
    receivedFingerprint
) {
    if (!receivedFingerprint) {
        throw new Error("Remote identity fingerprint is required");
    }

    const session = await this.loadSessionForDevice(
        conversationId,
        remoteDeviceId
    );

    if (!session) {
        return {
            trusted: false,
            status: "first_seen"
        };
    }

    const savedFingerprint =
        session.remoteIdentityFingerprint?.toLowerCase();

    const currentFingerprint = receivedFingerprint.toLowerCase();

    if (savedFingerprint !== currentFingerprint) {
        return {
            trusted: false,
            status: "identity_changed"
        };
    }

    return {
        trusted: true,
        status: "verified"
    };
},
async invalidateSession(sessionId, reason = "security_event") {
    const session = await this.loadSession(sessionId);

    if (!session) {
        return false;
    }

    await this.deleteSession(sessionId);

    console.warn("Session invalidated:", {
        sessionId,
        reason
    });

    return true;
},
async markPrekeyConsumed(deviceId, keyId) {
    if (!deviceId || !Number.isInteger(keyId)) {
        throw new Error("Invalid prekey information");
    }

    const database = await this.openDatabase();

    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(
                this.SESSION_STORE,
                "readwrite"
            );

            const store = transaction.objectStore(this.SESSION_STORE);

            const id = `consumed_prekey:${deviceId}:${keyId}`;

            store.put({
                id,
                deviceId,
                keyId,
                consumed: true,
                consumedAt: new Date().toISOString()
            });

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
},

async isPrekeyConsumed(deviceId, keyId) {
    const database = await this.openDatabase();

    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(
                this.SESSION_STORE,
                "readonly"
            );

            const request = transaction.objectStore(this.SESSION_STORE).get(
                `consumed_prekey:${deviceId}:${keyId}`
            );

            request.onsuccess = () => {
                resolve(request.result?.consumed === true);
            };

            request.onerror = () => reject(request.error);
        });
    } finally {
        database.close();
    }
},

};
