from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Future=True is required for async operation
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)


async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        # In prod, use Alembic. For this setup, we auto-create tables on startup.
        await conn.run_sync(SQLModel.metadata.create_all)
