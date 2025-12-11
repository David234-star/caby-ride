from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import Column


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    role: str = "rider"


class Ride(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    rider_id: int
    driver_id: Optional[int] = None

    # Stores lat/lon as a geometric point
    pickup_geom: str = Field(sa_column=Column(Geometry("POINT")))
    dropoff_geom: str = Field(sa_column=Column(Geometry("POINT")))

    status: str = "SEARCHING"  # SEARCHING, ACCEPTED, COMPLETED
    fare_estimate: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
