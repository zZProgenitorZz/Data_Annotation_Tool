from pydantic import BaseModel

class Label(BaseModel):
    id: int
    datasetId: int
    labelName: str


class LabelDto(BaseModel):
    id: int
    datasetId: int
    labelName: str