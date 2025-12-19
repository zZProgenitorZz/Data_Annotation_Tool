from backend.src.repositories.user_repo import UserRepo
from backend.src.models.user import User, UserUpdate, UserDto, InviteUserDto, CompleteInviteDto, ResetPasswordRequestDto
from backend.src.services.log_service import LogService
from backend.src.helpers.helpers import NotFoundError
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
import jwt
import secrets
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from backend.src.services.guest_session_service import get_guest_user
from backend.src.repositories.dataset_repo import DatasetRepo
from backend.src.helpers.mailgun_client import send_email_via_mailgun
from backend.config import settings

# JWT TOKEN
# to get a string like this run: 
# openssl rand -hex 32
SECRET_KEY = "4c4a026a8eed56c5b71112a2ba6fc9218a163a5ce6c3c915e2a41d1c4c9741a5"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/token")
bearer_scheme = HTTPBearer(auto_error=False)

class UserLogin:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()
        


    #AUTHORIZE
    def verify_password(self, plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)
    
    #AUTHORIZE
    def get_password_hash(self, password):
        return pwd_context.hash(password)
    
    #AUTHORIZE/AUTHENTICATION
    async def get_user(self, user_id: str):
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            return None  

        user_dto = self.to_dto(user)
        return user_dto
        
    #AUTHENTICATION
    async def authenticate_user(self ,username_or_email: str, password: str):
        user = await self.user_repo.get_user_by_username_or_email(username_or_email)
        if not user:
            return False
        if not self.verify_password(password, user.hashed_password):
            return False
        user_dto = self.to_dto(user)
        return user_dto
    
    #AUTHENTICATION
    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    #AUTHORIZE
    async def get_current_user(self, token: str):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            is_guest = payload.get("is_guest", False)
            if user_id is None:
                raise credentials_exception
        except InvalidTokenError:
            raise credentials_exception
        
        if is_guest:
            return get_guest_user(user_id)
        

        user = await self.get_user(user_id) 
        if user is None:
            raise credentials_exception
        return user
    
    # AUTHORIZE: Guest route
    async def get_guest_user_from_token(
        self, 
        credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)
    ):
        if not credentials:
            raise HTTPException(status_code=401, detail="No token provided")
        
        token = credentials.credentials
        guest = await self.get_current_user(token)
        
        if not getattr(guest, "is_guest", False):
            raise HTTPException(status_code=403, detail="Not a guest")
        
        return guest

        
    #AUTHORIZE: User route
    async def get_current_active_user(self, token: str = Depends(oauth2_scheme)):
        current_user = await self.get_current_user(token)  # oauth2_scheme wordt automatisch gebruikt

        if getattr(current_user, "is_guest", False):
            # dit is géén normale user → laat get_user_or_guest de guest-logica pakken
            raise HTTPException(
                status_code=401,
                detail="Guest token is not a normal user"
            )

        if current_user.disabled:
            raise HTTPException(status_code=400, detail="Inactive user")
        return current_user
    
    async def get_all_users(self):
        
        users = await self.user_repo.get_all_users()
        users_dto = []
        for user in users:
            users_dto.append(
                self.to_dto(user)
            )
        return users_dto



     #TO USERDTO    
    


    
    def to_dto(self, user: User) -> UserDto:
        return UserDto(
            id=str(user.id),
            username=user.username,
            email=user.email,
            role=user.role,
            disabled=user.disabled,
            is_guest= False
        )
    
class UserService:
    def __init__(self):
        self.user_repo = UserRepo()
        self.log = LogService()
        self.user_login = UserLogin()
        self.ds_repo = DatasetRepo()



    # Create a new user
    async def create_user(self, user: User, current_user: UserDto | None = None) -> str:
        # Hash the password before storing
        user.hashed_password = self.user_login.get_password_hash(user.hashed_password)

        created_user = user.model_dump()
        created_user.pop("id", None)  # Remove id if present, MongoDB will create one

        user_id = await self.user_repo.create_user(created_user)

        # Log the creation action
        if current_user:
            await self.log.log_action(
                user_id=user_id,
                action="CREATED_USER",
                target=user.username,
                details={
                    "created_by": current_user.username
                }
            )

        return user_id
    
    # Update user details
    async def update_user(self, user_id: str, updated_user: UserUpdate, current_user: UserDto | None = None) -> bool:
        updated_user_data = updated_user.model_dump(exclude_unset=True)
        updated_user_data.pop("id", None)  # Remove id if present

        # Get the old user data first
        old_user = await self.user_repo.get_user_by_id(user_id)
        if not old_user:
            raise NotFoundError(f"User with id {user_id} not found")

        # Hash password if updated
        if "hashed_password" in updated_user_data:
            updated_user_data["hashed_password"] = self.user_login.get_password_hash(updated_user_data["hashed_password"])

        # Perform the update
        user = await self.user_repo.update_user(user_id, updated_user_data)
        if not user:
            raise NotFoundError(f"Failed to update user with id {user_id}")

        # Compare old and new fields for logging
        changed_fields = {}
        for key, new_value in updated_user_data.items():
            old_value = getattr(old_user, key, None)
            if old_value != new_value:
                changed_fields[key] = {"old": old_value, "new": new_value}

        # Log the update action
        if current_user:
            await self.log.log_action(
                user_id=current_user.id,
                action="UPDATED_USER",
                target=old_user.username,
                details={
                    "changed_fields": changed_fields,
                    "updated_by": current_user.username
                }
            )

        return user
    
    # Delete a user
    async def delete_user(self, user_id: str, current_user: UserDto | None = None) -> bool:
        # Get the user to be deleted for logging
        datasets = await self.ds_repo.get_all_datasets()
        
        if datasets:
            for ds in datasets:
                ds_id = ds.id
                assigned = ds.assignedTo or []

                if not ds_id or not assigned:
                    continue

                new_assigned: list[str] = []
                changed = False
                
                for entry in assigned:
                    entry_str = str(entry)
                    user_part = entry_str.split(" - ", 1)[0]
                    if user_part == str(user_id):
                        changed = True
                        continue
                    new_assigned.append(entry_str)
                if changed:
                    await self.ds_repo.update_dataset(ds_id, {"assignedTo": new_assigned})

        
        user_to_delete = await self.user_repo.get_user_by_id(user_id)
        if not user_to_delete:
            raise NotFoundError(f"User with id {user_id} not found")

        succes = await self.user_repo.delete_user(user_id)
        if not succes:
            raise NotFoundError(f"Failed to delete user with id {user_id}")

        # Log the deletion action
        if current_user:
            await self.log.log_action(
                user_id=current_user.id,
                action="DELETED_USER",
                target=user_to_delete.username,
                details={
                    "deleted_by": current_user.username
                }
            )

        return succes

    
    async def invite_user(self, invite: InviteUserDto, current_user: UserDto | None = None) -> bool:
         # 1) Check: bestaat user al (op username of email)
        existing_by_username = await self.user_repo.get_user_by_username_or_email(invite.username)
        existing_by_email = await self.user_repo.get_user_by_username_or_email(invite.email)
        
        # Als er iemand bestaat, maar username/email horen bij 2 verschillende users -> conflict
        if existing_by_username and existing_by_email and existing_by_username.id != existing_by_email.id:
            raise HTTPException(status_code=400, detail="Username and email belong to different accounts")

        
        existing_user = existing_by_username or existing_by_email
        
        
        # 2) Maak altijd een nieuwe invite token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        # 3) Build invite link (fix double slash)
        frontend = settings.frontend_base_url.rstrip("/")
        invite_link = f"{frontend}/set-password?token={token}"

        

        # 4) Als user bestaat: update token/expiry + eventueel role/email/username (jij kiest)
        if existing_user:
          
            update_doc = {
                "invite_token": token,
                "invite_expires_at": expires_at,
              
            }


            # Je repo moet iets hebben zoals update_user(user_id, update_doc)
            await self.user_repo.update_user(str(existing_user.id), update_doc)

            # mail gaat naar bestaande user email (of invite.email als je dat wil)
            to_email = existing_user.email or invite.email
            to_username = existing_user.username or invite.username

            subject = "Create your AiDx Annotation Tool account"
            body = f"""
            Hi {to_username},

            An account has been created for you on the AiDx Annotation Tool.

            Please click the link below to set your password:

            {invite_link}

            If you did not expect this email, you can ignore it.

            Best regards,
            AiDx Annotation Tool
            """
           

            send_email_via_mailgun(to_email, subject, body)

            if current_user:
                await self.log.log_action(
                    user_id=current_user.id,
                    action="REINVITED_USER",
                    target=to_username,
                    details={
                        "existing_user_id": str(existing_user.id),
                        "created_by": current_user.username,
                    },
                )
            return True
        
        # 5) Als user NIET bestaat: create + mail
        user_doc = {
            "username": invite.username,
            "email": invite.email,
            "role": invite.role,
            "hashed_password": None,        # nog geen wachtwoord
            "disabled": True,
            "invite_token": token,
            "invite_expires_at": expires_at,
        }



        #  send email with Mailgun
        subject = "Create your AiDx Annotation Tool account"
        body = f"""
        Hi {invite.username},

        An account has been created for you on the AiDx Annotation Tool.

        Please click the link below to set your password:

        {invite_link}

        If you did not expect this email, you can ignore it.

        Best regards,
        AiDx Annotation Tool
        """


        send_email_via_mailgun(invite.email, subject, body)


        user_id = await self.user_repo.create_user(user_doc)

        # Loggen
        if current_user:
            await self.log.log_action(
                user_id=current_user.id,
                action="INVITED_USER",
                target=invite.username,
                details={
                    "created_user_id": user_id,
                    "created_by": current_user.username,
                },
            )

        return True
    
    async def request_password_reset(self, req: ResetPasswordRequestDto) -> bool:
        # 1) User op email
        user = await self.user_repo.get_user_by_username_or_email(req.email)

        # SECURITY (aanrader):
        # Doe alsof het altijd gelukt is, zodat je geen account existence lekt.
        if not user:
            return True

        # 2) Token + expiry
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=2)  # reset meestal korter dan invite

        # 3) Save token
        await self.user_repo.update_user(
            str(user.id),
            {
                "reset_token": token,
                "reset_expires_at": expires_at,
            },
        )

        # 4) Link (double slash fix)
        frontend = settings.frontend_base_url.rstrip("/")
        reset_link = f"{frontend}/reset-password?token={token}"

        # 5) Mail
        subject = "Reset your AiDx Annotation Tool password"
        body = f"""
        Hi {user.username or "there"},

        We received a request to reset your password.

        Click the link below to set a new password (valid for 2 hours):

        {reset_link}

        If you didn't request this, you can ignore this email.

        Best regards,
        AiDx Annotation Tool
        """
        send_email_via_mailgun(user.email, subject, body)

        # 6) Log
        # if current_user:
        #     await self.log.log_action(
        #         user_id=current_user.id,
        #         action="REQUESTED_PASSWORD_RESET",
        #         target=user.username or user.email,
        #         details={"target_user_id": str(user.id)},
        #     )

        return True

  
    async def completePasswordReset(self, dto: CompleteInviteDto) -> bool:
      
        user = await self.user_repo.get_user_by_reset_token(dto.token)
        if not user:
            raise HTTPException(status_code=400, detail="Reset or used Reset token")
        
       
        now = datetime.now(timezone.utc)
        exp = user.reset_expires_at

        # als exp naive is, behandel het als UTC (mits je het ook zo opslaat!)
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)


        if not exp or exp < now:
            raise HTTPException(status_code=400, detail="Reset token expired")
       
        

        hashed = self.user_login.get_password_hash(dto.password)

        updated = {
            "hashed_password": hashed,
            "reset_token": None,
            "reset_expires_at": None,
        }

        success = await self.user_repo.update_user(str(user.id), updated)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to set password")

        return True


    async def complete_invite(self, dto: CompleteInviteDto) -> bool:
        
        user = await self.user_repo.get_user_by_invite_token(dto.token)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or used invitation token")
        

        now = datetime.now(timezone.utc)
        exp = user.invite_expires_at

        # als exp naive is, behandel het als UTC (mits je het ook zo opslaat!)
        if exp is not None and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)


        if not exp or exp < now:
            raise HTTPException(status_code=400, detail="Invitation token expired")
        print("now")
        

        

        hashed = self.user_login.get_password_hash(dto.password)

        updated = {
            "disabled": False,
            "hashed_password": hashed,
            "invite_token": None,
            "invite_expires_at": None,
        }

        success = await self.user_repo.update_user(str(user.id), updated)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to set password")

        # optioneel: loggen
        await self.log.log_action(
            user_id=str(user.id),
            action="COMPLETED_INVITE",
            target=user.username,
            details={"message": "User set initial password"},
        )

        return True