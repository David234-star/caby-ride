from celery import Celery
from app.core.config import settings
import time

celery_app = Celery("worker", broker=f"redis://{settings.REDIS_HOST}:6379/0")


@celery_app.task
def send_receipt_email(ride_id: int, amount: float):
    # Simulate email sending delay
    time.sleep(2)
    print(f"📧 EMAIL SENT: Receipt for Ride #{ride_id} - Amount: ${amount}")
    return True
