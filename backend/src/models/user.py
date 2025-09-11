from pydantic import BaseModel

class User(BaseModel):
    id: int
    roleId: int
    username: str
    password: str
    is_active: bool

class UserDto(BaseModel):
    id: int
    username: str
    is_active: bool