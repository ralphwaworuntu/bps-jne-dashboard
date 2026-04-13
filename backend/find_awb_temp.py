import pandas as pd
import sys

file_path = r"e:\BPS JNE DASHBOARD\backend\uploads\firstmile\allshipment_firstmile.xlsx"
awb = "11003102631585"

try:
    df = pd.read_excel(file_path)
    # Normalize headers
    df.columns = [c.strip() for c in df.columns]
    
    # Check if AWB column exists
    if "AWB" not in df.columns:
        print("Column 'AWB' not found.")
        sys.exit(1)
        
    # Search
    row = df[df["AWB"].astype(str).str.strip() == awb]
    
    if row.empty:
        print(f"AWB {awb} not found in Excel.")
    else:
        print(f"Found AWB {awb}:")
        if "RECEIVING" in df.columns:
            val = row.iloc[0]["RECEIVING"]
            print(f"RECEIVING: '{val}'")
            print(f"Type: {type(val)}")
        else:
            print("Column 'RECEIVING' not found in Excel.")
            
except Exception as e:
    print(f"Error: {e}")
