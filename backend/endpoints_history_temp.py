
# --- Upload History Endpoints ---

@app.get("/api/upload-history")
def get_upload_history(
    current_user: User = Depends(get_current_active_user)
):
    """
    Scans upload directories and their archives to build a history of uploaded files.
    """
    history = []
    
    # helper to process a directory
    def scan_dir(category, directory: Path):
        if not directory.exists():
            return

        # Scan active file (if exists)
        # We know the specific active filenames
        active_filename = None
        if category == "Master Data":
            active_filename = "master_data.xlsx"
        elif category == "Lastmile DB":
            active_filename = "allshipment_lastmile.xlsx"
        elif category == "Firstmile DB":
            active_filename = "allshipment_firstmile.xlsx"
            
        if active_filename:
            fpath = directory / active_filename
            if fpath.exists():
                # Get Original Filename from meta
                meta_path = directory / (active_filename + ".meta")
                original_name = active_filename
                if meta_path.exists():
                    try:
                        with open(meta_path, "r") as f:
                            original_name = json.load(f).get("original_filename", active_filename)
                    except:
                        pass
                
                history.append({
                    "filename": active_filename,
                    "original_filename": original_name,
                    "upload_date": datetime.fromtimestamp(fpath.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                    "category": category,
                    "is_active": True,
                    "file_path": str(fpath) # Just for reference, not exposed to frontend usually
                })

        # Scan Archive
        archive_dir = directory / "archive"
        if archive_dir.exists():
            for fpath in archive_dir.iterdir():
                if fpath.is_file() and not fpath.name.endswith(".meta"):
                    # Parse timestamp from filename to be nicer? 
                    # Format: {stem}_{timestamp}{suffix}
                    # But sticking to file header mtime is easier and more reliable for "Upload Date"
                    # Original filename is trickier for archived files unless we saved meta for them too?
                    # save_upload_with_history moves the file. Does it move the meta?
                    # No, it effectively archives the FILE. The meta stays with the ACTIVE name?
                    # Wait, if we overwrite active, the old meta is overwritten.
                    # Ideally save_upload_with_history should archive the meta too.
                    # Current implementation does NOT archive meta.
                    # So for archived files, we might lose the original filename mapping unless encoded in the archive name?
                    # or if we infer it.
                    # For now, show system filename or try to parse.
                    
                    history.append({
                        "filename": fpath.name,
                        "original_filename": fpath.name, # Fallback since meta might be lost/mismatched
                        "upload_date": datetime.fromtimestamp(fpath.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                        "category": category,
                        "is_active": False,
                        "file_path": str(fpath)
                    })

    scan_dir("Master Data", MASTER_DATA_DIR)
    scan_dir("Lastmile DB", LASTMILE_DIR)
    scan_dir("Firstmile DB", FIRSTMILE_DIR)
    
    # Sort by date desc
    history.sort(key=lambda x: x["upload_date"], reverse=True)
    
    return history

@app.post("/api/reprocess/{category}/{filename}")
async def reprocess_file(
    category: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Restores a file from archive (or re-triggers active) and processes it.
    """
    target_dir = None
    active_filename = None
    
    if category == "Master Data":
        target_dir = MASTER_DATA_DIR
        active_filename = "master_data.xlsx"
    elif category == "Lastmile DB":
        target_dir = LASTMILE_DIR
        active_filename = "allshipment_lastmile.xlsx"
    elif category == "Firstmile DB":
        target_dir = FIRSTMILE_DIR
        active_filename = "allshipment_firstmile.xlsx"
    else:
        raise HTTPException(status_code=400, detail="Invalid category")
        
    # Locate Source File
    # Check if it is the active file
    source_path = target_dir / filename
    if not source_path.exists():
        # Check archive
        source_path = target_dir / "archive" / filename
        
    if not source_path.exists():
         raise HTTPException(status_code=404, detail="File not found")
         
    print(f"DEBUG: Reprocess requested for {source_path}")
    
    # ARCHIVE CURRENT ACTIVE IF DIFFERENT
    target_path = target_dir / active_filename
    if source_path != target_path and target_path.exists():
        # Move current active to archive (Manual archive to avoid Circular imports or complexity)
        archive_dir = target_dir / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        try:
             # Archive current active
             # Logic similar to save_upload_with_history but pure path ops
             stem = target_path.stem
             suffix = target_path.suffix
             archive_name = f"{stem}_{timestamp}{suffix}"
             shutil.move(str(target_path), str(archive_dir / archive_name))
             print(f"Archived current active to {archive_name}")
        except Exception as e:
            print(f"Warning: Failed to archive current active file: {e}")

    # RESTORE (COPY) TO ACTIVE
    if source_path != target_path:
        try:
            shutil.copy2(str(source_path), str(target_path))
            print(f"Restored {source_path} to {target_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to restore file: {e}")
            
    # TRIGGER PROCESSING
    try:
        # Read the file content
        # For Master: process_excel_data
        # For Firstmile: process_ots_general, process_ots_cabang
        # For Lastmile: No processing in upload_allshipment?
        
        if category == "Master Data":
             # Master Data processing (OTS Lastmile logic?)
             with open(target_path, "rb") as f:
                 content = f.read()
                 process_excel_data(content)
                 
        elif category == "Firstmile DB":
             # Firstmile processing
             df = pd.read_excel(target_path)
             
             # General
             df_general = process_ots_general(df)
             df_general.to_csv(FIRSTMILE_OTS_GENERAL_FILE, index=False)
             
             # Cabang
             df_cabang = process_ots_cabang(df)
             df_cabang.to_csv(FIRSTMILE_OTS_CABANG_FILE, index=False)
             
        elif category == "Lastmile DB":
             # Lastmile doesn't seem to have post-processing in upload_allshipment?
             # Checking code... upload_allshipment just saves.
             pass
             
    except Exception as e:
         import traceback
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

    return {
        "message": f"File {filename} restored and processed successfully",
        "category": category
    }

@app.get("/download/history/{category}/{filename}")
async def download_history_file(
    category: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    target_dir = None
    if category == "Master Data":
        target_dir = MASTER_DATA_DIR
    elif category == "Lastmile DB":
        target_dir = LASTMILE_DIR
    elif category == "Firstmile DB":
        target_dir = FIRSTMILE_DIR
    else:
        raise HTTPException(status_code=400, detail="Invalid category")
        
    # Check Active
    file_path = target_dir / filename
    if not file_path.exists():
        # Check Archive
        file_path = target_dir / "archive" / filename
        
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
