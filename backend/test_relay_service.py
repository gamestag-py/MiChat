
import pytest
import uuid
from unittest.mock import AsyncMock, patch

from app.services.relay_service import RelayService


@pytest.mark.asyncio
async def test_store_envelope():
    sender_device = uuid.uuid4().bytes
    recipient_device = uuid.uuid4().bytes
    envelope_id = str(uuid.uuid4())
    client_message_id = str(uuid.uuid4())

    sender = {"id": sender_device}
    recipient = {"id": recipient_device}

    stored_row = {
        "id": envelope_id,
        "server_timestamp": 1794260000000,
        "target_device_id": recipient_device,
        "delivered_at": None,
    }

    with patch(
        "app.services.relay_service.db.fetch_one",
        new_callable=AsyncMock,
    ) as fetch_one, patch(
        "app.services.relay_service.db.transaction"
    ) as transaction:

        fetch_one.side_effect = [
            sender,
            recipient,
            stored_row,
        ]

        class FakeCursor:
            execute = AsyncMock()

        class FakeTransaction:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

            def cursor(self):
                class CursorContext:
                    async def __aenter__(self):
                        return FakeCursor()

                    async def __aexit__(self, *args):
                        return False

                return CursorContext()

        transaction.return_value = FakeTransaction()

        result = await RelayService.store_envelope(
            envelope_id=envelope_id,
            sender_user_id=1,
            sender_device_id=sender_device,
            target_user_id=2,
            target_device_id=recipient_device,
            ciphertext=b"encrypted-test-payload",
            client_message_id=client_message_id,
        )

    assert result["message_id"] == envelope_id
    assert result["duplicate"] is False


@pytest.mark.asyncio
async def test_reject_invalid_device_id():
    with pytest.raises(ValueError):
        await RelayService.get_pending_envelopes(
            device_id=b"invalid"
        )


@pytest.mark.asyncio
async def test_reject_invalid_limit():
    with pytest.raises(ValueError):
        await RelayService.get_pending_envelopes(
            device_id=uuid.uuid4().bytes,
            limit=500,
        )
