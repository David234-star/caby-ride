
import stripe
import socketio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database import init_db, get_session
from app.models import Ride, User
from app.services.maps import maps_service
from app.worker import send_receipt_email
from pydantic import BaseModel

# Define the expected request body


class RideRequest(BaseModel):
    price: float
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float


# --- 1. Real-time Setup (Socket.IO + Redis) ---
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.ALLOWED_ORIGINS,
    client_manager=socketio.AsyncRedisManager(
        f"redis://{settings.REDIS_HOST}:6379/0")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # Create tables on startup
    yield

app = FastAPI(title="Caby API", lifespan=lifespan)

# Mount Socket.IO to /socket.io
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. API Endpoints ---


@app.get("/api/health")
async def health():
    return {"status": "ok", "db": "connected"}


@app.get("/api/rides/estimate")
async def estimate(origin: str, dest: str):
    dist, dur = maps_service.estimate_ride(origin, dest)
    if dist is None:
        raise HTTPException(status_code=400, detail="Route not found")

    # Pricing: $2.50 base + $1/km + $0.25/min
    price = 2.50 + (dist/1000 * 1.0) + (dur/60 * 0.25)

    return {
        "price": round(price, 2),
        "distance_km": round(dist/1000, 1),
        "duration_min": round(dur/60)
    }


@app.post("/api/rides/request")
async def request_ride(
    ride_req: RideRequest,  # <--- Change this from data: dict
    session: AsyncSession = Depends(get_session)
):
    # Create Ride in DB
    ride = Ride(
        rider_id=1,
        fare_estimate=ride_req.price,  # <--- Access via dot notation
        pickup_geom=f"POINT({ride_req.pickup_lng} {ride_req.pickup_lat})",
        dropoff_geom=f"POINT({ride_req.dropoff_lng} {ride_req.dropoff_lat})",
        status="SEARCHING"
    )
    session.add(ride)
    await session.commit()
    await session.refresh(ride)

    # Broadcast to "drivers"
    await sio.emit("new_ride_request", {"ride_id": ride.id})

    return {"ride_id": ride.id, "status": "SEARCHING"}

# --- 3. Simulation Endpoint ---


@app.post("/api/internal/simulate-accept/{ride_id}")
async def simulate_driver_found(ride_id: int, session: AsyncSession = Depends(get_session)):
    """Simulates a driver accepting the ride"""
    statement = select(Ride).where(Ride.id == ride_id)
    result = await session.execute(statement)
    ride = result.scalar_one_or_none()

    if not ride:
        return {"error": "Not found"}

    ride.status = "ACCEPTED"
    ride.driver_id = 99
    session.add(ride)
    await session.commit()

    # Notify Frontend via WebSocket
    await sio.emit("ride_status", {
        "status": "ACCEPTED",
        "driver": "John Doe (Toyota Prius)",
        "eta_mins": 4
    }, room=f"ride_{ride_id}")

    return {"status": "ok"}

# --- 4. WebSocket Events ---


@sio.on("join_ride")
async def handle_join(sid, ride_id):
    await sio.enter_room(sid, f"ride_{ride_id}")
    print(f"Socket {sid} joined room ride_{ride_id}")


# Initialize Stripe
stripe.api_key = settings.STRIPE_API_KEY


class CheckoutRequest(BaseModel):
    price: float
    user_email: str | None = None
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float


@app.post("/api/rides/create-checkout")
async def create_checkout_session(req: CheckoutRequest):
    try:
        # 1. Create a Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Caby Ride',
                        'description': 'Trip from A to B',
                    },
                    # Convert dollars to cents
                    'unit_amount': int(req.price * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='http://localhost:3000/?status=success',  # Redirect back to app
            cancel_url='http://localhost:3000/?status=cancel',
            customer_email=req.user_email
        )

        # 2. Return the URL to the frontend
        return {"checkout_url": checkout_session.url}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
