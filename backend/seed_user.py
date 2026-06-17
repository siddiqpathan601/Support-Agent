"""
Seeding and User Management Helper Script for Support Agent.
Allows creating, listing, and resetting passwords for users.
"""
import sys
from backend.app.models.db import SessionLocal, create_all_tables
from backend.app.models.user import User, UserRole
from backend.app.services.auth import hash_password

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\n--- Current Users in Database ---")
        if not users:
            print("No users found.")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Name: {u.full_name} | Role: {u.role} | Active: {u.is_active} | Hashed Password: {u.hashed_password}")
        print("---------------------------------\n")
    finally:
        db.close()

def seed_user(email: str, name: str, password: str, role_str: str):
    db = SessionLocal()
    try:
        # Check if role matches Enum
        role_map = {r.value: r for r in UserRole}
        if role_str not in role_map:
            print(f"Error: Invalid role '{role_str}'. Valid roles: {list(role_map.keys())}")
            return

        role = role_map[role_str]

        # Check for existing user
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists. Updating password and details...")
            user.full_name = name
            user.hashed_password = hash_password(password)
            user.role = role
            user.is_active = True
        else:
            print(f"Creating new user: {email}...")
            user = User(
                email=email,
                full_name=name,
                hashed_password=hash_password(password),
                role=role,
                is_active=True
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
        print(f"Successfully seeded/updated user: {user.email} with password '{password}' and role '{user.role.value}'")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables exist first
    print("Initializing database tables...")
    create_all_tables()

    if len(sys.argv) < 2:
        print("\n--- Running Default Seeding ---")
        # Automatically seed the personal admin account
        seed_user("support@company.com", "Support Admin", "Admin123", "support")
        
        list_users()
        print("\nUsage for manual seeding:")
        print("  List users:       python -m backend.seed_user list")
        print("  Seed/Update user: python -m backend.seed_user seed <email> <name> <password> <customer|support|admin>")
    else:
        cmd = sys.argv[1].lower()
        if cmd == "list":
            list_users()
        elif cmd == "seed":
            if len(sys.argv) < 6:
                print("Error: Missing arguments for seed.")
                print("Usage: python -m backend.seed_user seed <email> <name> <password> <customer|support|admin>")
            else:
                email = sys.argv[2]
                name = sys.argv[3]
                password = sys.argv[4]
                role = sys.argv[5].lower()
                seed_user(email, name, password, role)
        else:
            print(f"Unknown command: {cmd}")

