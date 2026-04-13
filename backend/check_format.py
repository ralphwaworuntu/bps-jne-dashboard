import sys

file_path = "e:/BPS JNE DASHBOARD/backend/uploads/geotagging/geotagging_data.xlsx"

try:
    with open(file_path, "rb") as f:
        header = f.read(10)
        print(f"File header: {header}")
        
    # Also try reading as CSV
    import pandas as pd
    try:
        df = pd.read_csv(file_path, sep=None, engine='python', nrows=5)
        print("Successfully read as CSV!")
        print("Columns:")
        print(df.columns.tolist())
    except Exception as e:
        print(f"Failed to read as CSV: {e}")
except Exception as e:
    print(f"Error checking file header: {e}")
