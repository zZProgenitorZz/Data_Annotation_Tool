# auth.py
from fastapi import Depends, HTTPException
from backend.src.models.user import User

async def get_current_user() -> User:
    # hier haal je de user uit je JWT token of session
    user = ...  # bijv. decode token
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

#Voor nu
# current_user: User = Depends(get_current_user)
#in Controllers van services met logs