import json
import aiofiles
import httpx
from typing import Optional
from app.config import settings


def _api(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"


async def send_receipt_to_admin(
    payment_id: int,
    reservation_ref: str,
    guest_name: str,
    amount: float,
    slip_url: str,
    slip_local_path: Optional[str] = None,
):
    """Send receipt photo to admin with Approve/Reject buttons.

    Tries to send the photo by URL first (fast). If Telegram can't fetch the URL
    (e.g. ngrok not reachable from Telegram servers), falls back to reading the
    file from the local filesystem and uploading it directly — avoids making an
    HTTP self-request back through ngrok.
    """
    caption = (
        f"🧾 *New Payment Receipt*\n\n"
        f"📋 Booking: `{reservation_ref}`\n"
        f"👤 Guest: {guest_name}\n"
        f"💰 Amount: *${amount:.2f}*\n\n"
        f"Please review and approve or reject."
    )

    reply_markup = json.dumps({
        "inline_keyboard": [[
            {"text": "✅ Approve", "callback_data": f"approve:{payment_id}"},
            {"text": "❌ Reject",  "callback_data": f"reject:{payment_id}"},
        ]]
    })

    async with httpx.AsyncClient(timeout=30) as client:
        # 1) Try sending as a photo URL (Telegram fetches it directly)
        resp = await client.post(
            _api("sendPhoto"),
            json={
                "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
                "photo": slip_url,
                "caption": caption,
                "parse_mode": "Markdown",
                "reply_markup": json.loads(reply_markup),
            }
        )
        result = resp.json()

        if result.get("ok"):
            return  # success — done

        # 2) URL send failed (Telegram couldn't fetch the URL).
        #    Read the file from disk rather than downloading via HTTP to avoid
        #    routing the request back through ngrok.
        img_bytes: Optional[bytes] = None

        if slip_local_path:
            # slip_local_path is like "/uploads/payment_slips/abc.jpg"
            local_fs_path = slip_local_path.lstrip("/")
            try:
                async with aiofiles.open(local_fs_path, "rb") as f:
                    img_bytes = await f.read()
            except Exception:
                img_bytes = None

        if img_bytes is None:
            # Last resort: try HTTP download (may work if ngrok is reachable)
            try:
                dl = await client.get(slip_url)
                img_bytes = dl.content
            except Exception:
                img_bytes = None

        if img_bytes:
            await client.post(
                _api("sendPhoto"),
                data={
                    "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
                    "caption": caption,
                    "parse_mode": "Markdown",
                    "reply_markup": reply_markup,
                },
                files={"photo": ("receipt.jpg", img_bytes, "image/jpeg")},
            )


async def send_message(chat_id: str, text: str):
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            _api("sendMessage"),
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
            }
        )


async def answer_callback(callback_query_id: str, text: str = "") -> None:
    """Acknowledge an inline button tap so Telegram clears the loading spinner."""
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            _api("answerCallbackQuery"),
            json={"callback_query_id": callback_query_id, "text": text},
        )


async def edit_reply_markup(chat_id: str, message_id: int) -> None:
    """Remove the inline keyboard from a message after the action is taken."""
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            _api("editMessageReplyMarkup"),
            json={
                "chat_id": chat_id,
                "message_id": message_id,
                "reply_markup": {"inline_keyboard": []},
            },
        )
