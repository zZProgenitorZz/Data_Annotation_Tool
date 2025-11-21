from backend.src.services.user_service import UserLogin, oauth2_scheme
from backend.src.models.user import UserDto
from typing import List
from fastapi import Depends, status, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


bearer_scheme = HTTPBearer()

user_login = UserLogin()

# Combineer user en guest authorization
async def get_user_or_guest(
    token: str = Depends(oauth2_scheme),
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)  # ⚡ auto_error=False
):
    """
    Probeer eerst een normale user, anders een guest.
    """
    # Probeer normale user
    try:
        user = await user_login.get_current_active_user(token)

        return user
    
    except HTTPException as e:
        if e.status_code != 401:
            # andere fouten doorgeven
            raise

    # Probeer guest
    if not credentials:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    guest = await user_login.get_guest_user_from_token(credentials)
    print(guest)
    return guest


# Dependency voor role-check
def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user = Depends(get_user_or_guest)):
        """
        Controleer of huidige user/guest een toegestane rol heeft
        """
        if getattr(current_user, "role", None) not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user
    return role_checker



def is_guest_user(user: UserDto) -> bool:
    """Returns True if user is a guest"""
    
    return getattr(user, 'is_guest', False)


def require_guest_user():
    async def _inner(current_user = Depends(get_user_or_guest)):
        if not is_guest_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only guest users can access this endpoint"
            )
        return current_user
    return _inner

def require_normal_user():
    async def _inner(current_user = Depends(get_user_or_guest)):
        if is_guest_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guest users cannot access this endpoint"
            )
        return current_user
    return _inner
