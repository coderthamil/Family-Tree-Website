"""
Seed script — creates a default admin user if none exists.
Run: python -m app.seed
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.auth.password import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        existing = result.scalar_one_or_none()
        if existing:
            print("Admin user already exists.")
            return

        admin = User(
            username="admin",
            email="admin@familytree.local",
            full_name="System Admin",
            hashed_password=hash_password("Admin@1234"),
            role=UserRole.admin,
            is_active="true",
        )
        db.add(admin)
        await db.commit()
        print("[OK] Admin user created: username=admin  password=Admin@1234")
        print("[!] Change this password immediately after first login!")


if __name__ == "__main__":
    asyncio.run(seed())
