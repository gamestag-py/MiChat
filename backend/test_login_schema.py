
from app.schemas.auth import LoginRequest

valid_email = LoginRequest(
    email="test@example.com",
    password="TestPassword123!"
)

valid_phone = LoginRequest(
    phone_number="9876543210",
    password="TestPassword1123!"
)

print("Email login:", valid_email.email)
print("Phone login:", valid_phone.phone_number)

try:
    LoginRequest(password="StrongPassword123!")
except Exception as exc:
    print("Missing identifier rejected:", True)

try:
    LoginRequest(
        email="test@example.com",
        phone_number="+919876543210",
        password="StrongPassword123!"
    )
except Exception as exc:
    print("Multiple identifiers rejected:", True)
