
import pandas as pd
from datetime import datetime

def process_ots_general(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies strict filtering for 'Database OTS' (General).
    1. Drop rows where STATUS_POD in ["Success", "Return Shipper"]
    2. Drop rows where CODING == "CR8"
    """
    # Normalize headers
    df.columns = [c.strip() for c in df.columns]
    
    # 1. STATUS_POD Filter
    if "STATUS_POD" in df.columns:
        status_drop = ["success", "return shipper"]
        mask_status = df["STATUS_POD"].astype(str).str.strip().str.lower().isin(status_drop)
        df = df[~mask_status]
        
    # 2. CODING Filter
    if "CODING" in df.columns:
        coding_drop = ["cr8"]
        mask_coding = df["CODING"].astype(str).str.strip().str.lower().isin(coding_drop)
        df = df[~mask_coding]
        
    return df

def process_ots_cabang(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies complex filtering for 'Database OTS Cabang'.
    Logic involves checking TGL_RECEIVED > 3 months.
    """
    # Normalize headers
    df.columns = [c.strip() for c in df.columns]
    
    # Ensure Date Column Exists
    date_col = "TGL_RECEIVED"
    if "RECEIVING" in df.columns:
        date_col = "RECEIVING"
    elif date_col not in df.columns:
        # Fallback or Error? For now return empty or try to proceed if possible
        # Check alternatives
        if "INBOUND_MANIFEST_DATE" in df.columns:
            date_col = "INBOUND_MANIFEST_DATE"
        elif "TGL_Received" in df.columns:
             date_col = "TGL_Received"
    
    if date_col in df.columns:
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    current_time = datetime.now()
    drop_mask = pd.Series([False] * len(df))
    
    # Helper for 3 month check
    # > 3 months means roughly > 90 days
    def is_older_than_3_months(series_date):
        if date_col not in df.columns: return False
        days = (current_time - series_date).dt.days
        return days > 90

    # 1. STATUS_POD: Success, Return Shipper (ALWAYS DROP)
    if "STATUS_POD" in df.columns:
        status_series = df["STATUS_POD"].astype(str).str.strip().str.lower()
        
        # Rule 1
        mask_rule_1 = status_series.isin(["success", "return shipper"])
        drop_mask |= mask_rule_1
        
        if date_col in df.columns:
            age_mask = is_older_than_3_months(df[date_col])
            
            # Rule 2: Missing > 3 mo
            mask_rule_2 = (status_series == "missing") & age_mask
            drop_mask |= mask_rule_2
            
            # Rule 3: Damage Case > 3 mo
            mask_rule_3 = (status_series == "damage case") & age_mask
            drop_mask |= mask_rule_3
            
            # Rule 4: Destroyed > 3 mo
            mask_rule_4 = (status_series == "destroyed") & age_mask
            drop_mask |= mask_rule_4

    # CODING Checks
    if "CODING" in df.columns:
        coding_series = df["CODING"].astype(str).str.strip().str.lower()
        
        # Rule 5: CR8 (ALWAYS DROP)
        mask_rule_5 = coding_series == "cr8"
        drop_mask |= mask_rule_5
        
        # Rule 7: UF, RFD, RFI (ALWAYS DROP)
        mask_rule_7 = coding_series.isin(["uf", "rfd", "rfi"])
        drop_mask |= mask_rule_7
        
        if date_col in df.columns:
            age_mask = is_older_than_3_months(df[date_col])
            
            # Rule 6: R25, R37 > 3 mo
            mask_rule_6 = coding_series.isin(["r25", "r37"]) & age_mask
            drop_mask |= mask_rule_6
            
            # Rule 8: CL1, CL2, D26, D37 > 3 mo
            coding_targets = ["cl1", "cl2", "d26", "d37"]
            mask_rule_8 = coding_series.isin(coding_targets) & age_mask
            drop_mask |= mask_rule_8
            
            # Rule 9: U37 (NEVER DROP - Logic is simply NOT adding to drop_mask)
            # Implicitly handled as we only add to drop_mask

    return df[~drop_mask]
