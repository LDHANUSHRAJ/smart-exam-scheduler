"""
Notification service placeholder.
Can be extended with email, push, or WebSocket notifications.
"""

from typing import List


async def send_conflict_alert(user_id: str, conflicts: List[dict]) -> None:
    """Send notification about exam conflicts. Placeholder for now."""
    # In production, this could send emails or push notifications
    pass


async def send_plan_ready_notification(user_id: str, plan_id: str) -> None:
    """Notify user that their study plan is ready."""
    pass


async def send_exam_reminder(user_id: str, exam_subject: str, days_until: int) -> None:
    """Send exam reminder notification."""
    pass
