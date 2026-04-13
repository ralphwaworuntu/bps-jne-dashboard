
import pandas as pd
import os

lastmile_path = "uploads/lastmile/allshipment_lastmile.xlsx"
firstmile_path = "uploads/firstmile/allshipment_firstmile.xlsx"

def check_file(path, name):
    print(f"--- Checking {name} ---")
    if not os.path.exists(path):
        print("File NOT FOUND!")
        return

    try:
        df = pd.read_excel(path, nrows=5)
        print(f"File Size: {os.path.getsize(path) / (1024*1024):.2f} MB")
        print("First 5 rows (Verify Content):")
        print(df.to_string())
    except Exception as e:
        print(f"Error reading file: {e}")
    print("\n")

check_file(lastmile_path, "Lastmile Database")
check_file(firstmile_path, "Firstmile Database")
