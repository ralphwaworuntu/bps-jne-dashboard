with open('e:\\BPS JNE DASHBOARD\\backend\\routers\\correction_request.py', 'a') as f:
    f.write('''
@router.get("/export-correction-requests")
async def export_correction_requests(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    awb: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Base query
    statement = select(CorrectionRequest)
    
    # Apply filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
            statement = statement.where(CorrectionRequest.entry_date >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            statement = statement.where(CorrectionRequest.entry_date <= end_dt)
        except ValueError:
            pass

    if awb:
        statement = statement.where(CorrectionRequest.awb == awb)
        
    if status:
        statement = statement.where(CorrectionRequest.status == status)

    statement = statement.order_by(CorrectionRequest.entry_date.desc())
    results = session.exec(statement).all()
    
    if not results:
        raise HTTPException(status_code=404, detail="No data found for the given filters")

    # Serialize to dict for pandas
    data = []
    for req in results:
        data.append({
            "TGL Request": req.entry_date.strftime("%Y-%m-%d %H:%M:%S") if req.entry_date else "",
            "AWB": req.awb,
            "Address 1": req.address_1,
            "Address 2": req.address_2,
            "Kode Awal": req.coding_awal,
            "Kecamatan Awal": req.kecamatan_awal,
            "Kode Akhir": req.coding_akhir,
            "Kecamatan Akhir": req.kecamatan_akhir,
            "Alasan": req.alasan,
            "Status": req.status,
            "Alasan Penolakan": req.rejection_reason or "-"
        })
        
    df = pd.DataFrame(data)
    
    # Save to memory buffer
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Data Cordest')
    
    buffer.seek(0)
    
    # Return as StreamingResponse
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"Data_Cordest_{timestamp}.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buffer, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
''')
