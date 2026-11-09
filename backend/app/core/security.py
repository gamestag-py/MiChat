
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Generate an Argon2id password hash."""
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its stored hash."""
    try:
        return password_hasher.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError):
        return False


def password_needs_rehash(hashed_password: str) -> bool:
    """Check whether the hash needs updated parameters."""
    return password_hasher.check_needs_rehash(hashed_password)
