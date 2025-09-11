from pydantic import BaseModel

class Role(BaseModel):
    id: int
    name: str
    permission: bool
    is_active: bool 

class RoleDto(BaseModel):
    id: int
    name: str
    permission: bool
    is_active: bool 