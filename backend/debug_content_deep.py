
import pandas as pd
import os
import time

files = {
    "Lastmile": "uploads/lastmile/allshipment_lastmile.xlsx",
    "Firstmile": "uploads/firstmile/allshipment_firstmile.xlsx"
}

print("--- FILE METADATA ---\n")
for name, path in files.items():
    if os.path.exists(path):
        mod_time = time.ctime(os.path.getmtime(path))
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"[{name}]")
        print(f"Path: {path}")
        print(f"Modified: {mod_time}")
        print(f"Size: {size_mb:.2f} MB")
    else:
        print(f"[{name}] NOT FOUND")
    print("-" * 20)

print("\n\n--- CONTENT INSPECTION (Row 45) ---\n")

def inspect_row(name, path):
    if not os.path.exists(path):
        return

    print(f"Reading {name}...")
    try:
        # Read headers and row 45 (index 43)
        # We read 50 rows to be safe
        df = pd.read_excel(path, nrows=50)
        
        # Row 45 in Excel is Index 43 (assuming Row 1 is Header)
        target_idx = 43 
        
        if len(df) <= target_idx:
            print(f"File has less than {target_idx} rows.")
            return

        row_data = df.iloc[target_idx]
        
        print(f"\nData for Excel Row 45 (Index {target_idx}):")
        print("--------------------------------------------------")
        # Print all columns with their index to help user find "AJ"
        for i, (col, val) in enumerate(row_data.items()):
            # Calculate Excel Column Name (e.g. 0->A, 35->AJ)
            # Simple converter for display
            col_letter = ""
            if i < 26:
                col_letter = chr(65 + i)
            else:
                col_letter = chr(65 + (i // 26) - 1) + chr(65 + (i % 26))
            
            print(f"Col {col_letter} ({i}): {col} = {val}")
        print("--------------------------------------------------\n")

    except Exception as e:
        print(f"Error reading {name}: {e}")

inspect_row("Lastmile", files["Lastmile"])
