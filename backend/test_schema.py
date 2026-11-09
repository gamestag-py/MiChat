
from app.schemas.auth import RegisterRequest

data = {
    "email": "test@example.com",
    "username": "test_user",
    "display_name": "Test User",
    "password": "StrongPassword123!"
}

user = RegisterRequest(**data)

print("Registration schema valid")
print(user.model_dump(exclude={"password"}))
