
from app.core.security import (
    hash_password,
    verify_password,
    password_needs_rehash
)

password = "StrongPassword123!"

hashed = hash_password(password)

print("Password hashed:", hashed.startswith("$argon2id$"))
print("Correct password:", verify_password(password, hashed))
print("Incorrect password:", verify_password("wrong-password", hashed))
print("Needs rehash:", password_needs_rehash(hashed))
