import pandas as pd
import sys

file_path = "e:/BPS JNE DASHBOARD/backend/uploads/geotagging/geotagging_data.xlsx"

try:
    df = pd.read_excel(file_path, nrows=5, engine='openpyxl')
    print("Columns:")
    print(df.columns.tolist())
    print("\nFirst row preview:")
    print(df.iloc[0].to_dict())
except Exception as e:
    print(f"Error reading file: {e}")
