import pandas as pd
import json
import os
from pathlib import Path

def calculate_firstmile_stats(df: pd.DataFrame) -> dict:
    """
    Calculate stats for Firstmile data:
    1. Total Shipments
    2. Success Rate (Count of STATUS_POD == 'Success' / Total * 100)
    """
    total_shipments = len(df)
    
    if total_shipments == 0:
        return {
            "total_shipments": 0,
            "success_rate": 0,
            "success_count": 0
        }
    
    # Ensure STATUS_POD column exists, case insensitive check could be better but sticking to exact requirement first
    if 'STATUS_POD' in df.columns:
        success_count = len(df[df['STATUS_POD'] == 'Success'])
        success_rate = (success_count / total_shipments) * 100
    else:
        success_count = 0
        success_rate = 0
        
    top_routes = []
    # Check for DEST or DESTINATION
    dest_col = 'DEST' if 'DEST' in df.columns else 'DESTINATION' if 'DESTINATION' in df.columns else None
    
    if dest_col:
        # Get top 5 destinations
        top_dest_counts = df[dest_col].value_counts().head(5)
        for dest, count in top_dest_counts.items():
            top_routes.append({
                "destination": str(dest),
                "count": int(count),
                "percentage": round((count / total_shipments) * 100, 1)
            })

    return {
        "total_shipments": total_shipments,
        "success_rate": round(success_rate, 2),
        "success_count": success_count,
        "top_routes": top_routes
    }

def save_analytics_cache(category: str, data: dict):
    """
    Save analytics data to JSON cache.
    category: 'firstmile' or 'lastmile'
    """
    # Define cache path based on category (using existing upload dirs logic would be safer if imported, 
    # but for utility independence let's construct path relative to CWD or pass base dir)
    # Assuming CWD is backend root.
    
    base_dir = Path(f"uploads/{category}")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    cache_path = base_dir / "analytics_cache.json"
    
    with open(cache_path, "w") as f:
        json.dump(data, f)
        
    return str(cache_path)

def load_analytics_cache(category: str) -> dict:
    """
    Load analytics data from JSON cache.
    """
    cache_path = Path(f"uploads/{category}/analytics_cache.json")
    
    if cache_path.exists():
        with open(cache_path, "r") as f:
            return json.load(f)
            
    return None
