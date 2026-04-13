
import pandas as pd
import os

target_awb = "11003107721294"
files = {
    "Lastmile": "uploads/lastmile/allshipment_lastmile.xlsx",
    "Firstmile": "uploads/firstmile/allshipment_firstmile.xlsx"
}

def find_awb(name, path):
    print(f"--- Searching in {name} ---")
    if not os.path.exists(path):
        print("File NOT FOUND!")
        return

    try:
        # Load file
        df = pd.read_excel(path)
        
        # Normalize headers
        df.columns = [str(c).strip().upper() for c in df.columns]
        
        # Identify AWB Column (try common names)
        awb_col = None
        possible_names = ["AWB", "CNOTE", "CONNOTE", "NO_RESI", "AIRWAYBILL"]
        
        for col in df.columns:
            if any(p in col for p in possible_names):
                awb_col = col
                break
        
        # If no specific column found, we scan the whole DF (slower but safer)
        # But let's try to convert all to string and search
        
        found = False
        
        # Iterate rows (inefficient for huge data but fine for this check)
        # Better: use pandas filtering
        
        # stringify entire dataframe for searching
        # This might be memory intensive but for 27MB it's okay-ish. 
        # Actually safer to check specific likely columns if possible, but let's try a tailored search.
        
        # Let's clean the target AWB
        clean_target = str(target_awb).strip()
        
        # Attempt to find the row
        # We look for exact match in any column stringified
        mask = df.astype(str).apply(lambda x: x.str.strip() == clean_target).any(axis=1)
        
        if mask.any():
            print(f"FOUND AWB {clean_target}!")
            filtered = df[mask]
            
            # Find RUNSHEET_NO column
            runsheet_col = None
            for col in df.columns:
                if "RUNSHEET" in col:
                    runsheet_col = col
                    break
            
            if runsheet_col:
                val = filtered.iloc[0][runsheet_col]
                print(f"RUNSHEET_NO: {val}")
                print(f"(Found in column: {runsheet_col})")
            else:
                print("AWB found, but RUNSHEET_NO column missing!")
                print(f"Available columns: {list(df.columns)}")
                
        else:
            print(f"AWB {clean_target} NOT FOUND in this file.")

    except Exception as e:
        print(f"Error processing {name}: {e}")
    print("\n")

for name, path in files.items():
    find_awb(name, path)
