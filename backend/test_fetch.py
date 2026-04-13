from sqlmodel import Session, select
from models import CorrectionRequest
from database import engine
import traceback
import sys

print("Starting fetch...")
try:
    with Session(engine) as session:
        statement = select(CorrectionRequest)
        results = session.exec(statement).all()
        print(f"Got {len(results)} db results.")
        output = []
        for req in results:
            req_dict = req.dict()
            req_dict["attachments"] = [att.dict() for att in req.attachments]
            output.append(req_dict)
            
        print(f"Success! Serialized {len(output)} rows.")
except BaseException as e:
    with open('c:\\tmp\\err.txt', 'w') as f:
        traceback.print_exc(file=f)
    print("Error saved to c:\\tmp\\err.txt")
