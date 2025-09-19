from pydantic import BaseModel, Field
from typing import Optional
from backend.src.helpers.objectid_helper import PyObjectId


class Role(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    roleName: str
    deletePermission: bool
    annotationPermission: bool
    managementPermission: bool
    logViewPermission: bool
    addPermission: bool

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
 

class RoleDto(BaseModel):
    id: Optional[str] = None
    roleName: str
    deletePermission: bool
    annotationPermission: bool
    managementPermission: bool
    logViewPermission: bool
    addPermission: bool

class RoleUpdate(BaseModel):
    id: Optional[str] = None
    roleName: Optional[str] = None
    deletePermission: Optional[bool] = None
    annotationPermission: Optional[bool] = None
    managementPermission: Optional[bool] = None
    logViewPermission: Optional[bool] = None
    addPermission: Optional[bool] = None