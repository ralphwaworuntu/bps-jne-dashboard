from fastapi import APIRouter, Depends, HTTPException
from utils.analytics_helper import load_analytics_cache

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{category}")
def get_analytics(category: str):
    """
    Get analytics stats for a specific category (firstmile, lastmile).
    """
    if category not in ['firstmile', 'lastmile']:
        raise HTTPException(status_code=400, detail="Invalid category")
        
    data = load_analytics_cache(category)
    
    if not data:
        # Return default zero values if no cache found
        return {
            "total_shipments": 0,
            "success_rate": 0,
            "success_count": 0
        }
        
    return data
