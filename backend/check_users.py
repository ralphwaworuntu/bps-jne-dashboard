from sqlmodel import Session, select, create_engine
from models import User

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def check_users():
    with Session(engine) as session:
        statement = select(User)
        results = session.exec(statement)
        users = results.all()
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- ID: {user.id}, Email: {user.email}, Role: {user.role}, Name: {user.full_name}")

if __name__ == "__main__":
    check_users()
