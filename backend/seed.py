from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import User
from auth import get_password_hash
import sys

def seed_users():
    print("Initializing database...")
    create_db_and_tables()
    
    # List of users to create
    # Format: (email, full_name, role)
    users_to_create = [
        ("admin@bps.go.id", "Super Admin", "Super Admin"), # Existing admin
        ("admincabang@bps.go.id", "Admin Cabang", "Admin Cabang"),
        ("adminbps@bps.go.id", "Admin BPS", "Admin BPS"),
        ("admininbound@bps.go.id", "Admin Inbound", "Admin Inbound"),
        ("adminoutbound@bps.go.id", "Admin Outbound", "Admin Outbound"),
        ("adminpickup@bps.go.id", "Admin Pickup", "Admin Pickup"),
        ("adminsco@bps.go.id", "Admin SCO", "Admin SCO"),
        ("adminsalles@bps.go.id", "Admin Salles", "Admin Salles"),
        ("adminfinance@bps.go.id", "Admin Finance", "Admin Finance"),
        ("adminccc@bps.go.id", "Admin CCC", "Admin CCC"),
        ("admincod@bps.go.id", "Admin COD", "Admin COD"),
        ("admincomplience@bps.go.id", "Admin Complience", "Admin Complience"),
        ("piccabang@bps.go.id", "PIC Cabang", "PIC Cabang"),
    ]

    try:
        with Session(engine) as session:
            print(f"checking for {len(users_to_create)} users...")
            
            for email, name, role in users_to_create:
                statement = select(User).where(User.email == email)
                results = session.exec(statement)
                user = results.first()
                
                if not user:
                    print(f"Creating user: {email} ({role})...")
                    pwd = "admin123"
                    hashed_pwd = get_password_hash(pwd)
                    
                    new_user = User(
                        email=email,
                        full_name=name,
                        role=role,
                        hashed_password=hashed_pwd,
                        is_active=True,
                        shift="Regular Shift" # Default shift
                    )
                    session.add(new_user)
                    session.commit()
                    print(f"User '{email}' created.")
                else:
                    # Optional: Update role if it changed, but for now just skip
                    if user.role != role:
                        print(f"Updating role for {email} from {user.role} to {role}")
                        user.role = role
                        session.add(user)
                        session.commit()
                    else:
                        print(f"User '{email}' already exists.")
                        
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    seed_users()
