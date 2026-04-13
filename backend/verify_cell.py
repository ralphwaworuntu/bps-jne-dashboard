
import pandas as pd
import os

file_path = "uploads/lastmile/allshipment_lastmile.xlsx"

def check_specific_cell(path):
    print(f"--- Checking Cell AJ45 in {path} ---")
    if not os.path.exists(path):
        print("File NOT FOUND!")
        return

    try:
        # Read enough rows to get to 45 (nrows=50)
        # header=0 implies Row 1 is header. 
        df = pd.read_excel(path, nrows=60, header=0)
        
        # Column AJ is the 36th column (Index 35)
        col_idx = 35
        
        if len(df.columns) <= col_idx:
            print(f"Error: File has fewer than {col_idx+1} columns.")
            return

        col_name = df.columns[col_idx]
        print(f"Column AJ Header: '{col_name}'")

        # Row 45 in Excel means:
        # Row 1 = Header
        # Row 2 = Index 0
        # ...
        # Row 45 = Index 43
        
        target_indices = [42, 43, 44] # Rows 44, 45, 46 in Excel
        
        print("\n--- Data Sample ---")
        for idx in target_indices:
            if idx < len(df):
                val = df.iloc[idx, col_idx]
                excel_row = idx + 2
                print(f"Excel Row {excel_row} (Idx {idx}): {val}")
            else:
                print(f"Index {idx} out of bounds")

    except Exception as e:
        print(f"Error reading file: {e}")
    print("\n")

check_specific_cell(file_path)
