import sys
import os
import pandas as pd
from pathlib import Path

# Add backend directory to sys.path
# Script is in backend/scripts, so we need to go up one level
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from utils.analytics_helper import calculate_firstmile_stats, save_analytics_cache

# Define paths relative to backend root
UPLOAD_DIR = BASE_DIR / "uploads"
FIRSTMILE_DIR = UPLOAD_DIR / "firstmile"
FIRSTMILE_FILE = FIRSTMILE_DIR / "allshipment_firstmile.xlsx" 

def refresh_firstmile_analytics():
    print(f"Base Dir: {BASE_DIR}")
    print(f"Checking for Firstmile file at: {FIRSTMILE_FILE}")
    
    if not FIRSTMILE_FILE.exists():
        print("Firstmile file not found. Skipping.")
        return

    try:
        print("Loading Firstmile data...")
        # Check if pickle exists for speed
        pickle_path = FIRSTMILE_FILE.with_suffix('.pkl')
        if pickle_path.exists():
             df = pd.read_pickle(pickle_path)
             print(f"Loaded from pickle. Rows: {len(df)}")
        else:
             df = pd.read_excel(FIRSTMILE_FILE, engine='openpyxl')
             print(f"Loaded from excel. Rows: {len(df)}")
        
        print(f"Columns: {df.columns.tolist()}")
             
        print("Calculating stats...")
        stats = calculate_firstmile_stats(df)
        
        print(f"Stats calculated: {stats.keys()}")
        print(f"Top Routes: {stats.get('top_routes')}")
        
        save_analytics_cache("firstmile", stats)
        print("Cache refreshed successfully.")
        
    except Exception as e:
        print(f"Error refreshing analytics: {e}")

if __name__ == "__main__":
    refresh_firstmile_analytics()
