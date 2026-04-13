from fastapi import UploadFile
import shutil
from pathlib import Path
from datetime import datetime
import os

import json

def save_upload_with_history(file: UploadFile, directory: Path, filename: str, original_filename: str = None, user_email: str = None) -> Path:
    """
    Saves an uploaded file to the specified directory with the given filename.
    If the file already exists, it moves the existing file to an 'archive' subdirectory
    with a timestamp appended to the filename.
    Also saves a .meta JSON file containing the original filename and uploader info.
    """
    
    print(f"DEBUG: Ensure directory exists: {directory}")
    # Ensure directory exists
    directory.mkdir(parents=True, exist_ok=True)
    
    target_path = directory / filename
    meta_path = directory / (filename + ".meta")
    
    print(f"DEBUG: Target path: {target_path}")
    
    # Check if file exists -> Archive it
    if target_path.exists():
        archive_dir = directory / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name_stem = target_path.stem
        suffix = target_path.suffix
        
        archive_filename = f"{name_stem}_{timestamp}{suffix}"
        archive_path = archive_dir / archive_filename
        
        try:
            shutil.move(str(target_path), str(archive_path))
            print(f"Archived existing file to: {archive_path}")
            
            # Archive metadata too if possible
            # But the requirement is just to have metadata for history.
            # If we archive the file, the OLD .meta referring to it (if any) is currently overwritten by the NEW .meta
            # Ideally we should archive the .meta too so the history scanner can match them.
            if meta_path.exists():
                archive_meta_path = archive_dir / (archive_filename + ".meta")
                shutil.move(str(meta_path), str(archive_meta_path))
                
        except Exception as e:
            print(f"Failed to archive file: {e}")

    # Save new file
    print(f"DEBUG: Saving new file to {target_path}")
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Save metadata
        meta_data = {}
        if original_filename:
            meta_data["original_filename"] = original_filename
        if user_email:
            meta_data["uploaded_by"] = user_email
            
        if meta_data:
            with open(meta_path, "w") as meta_file:
                json.dump(meta_data, meta_file)
            print(f"DEBUG: Metadata saved to {meta_path}")
            
        print(f"DEBUG: File saved successfully")
    except Exception as e:
        print(f"DEBUG ERROR: Failed to save file: {e}")
        raise e
        
    return target_path
