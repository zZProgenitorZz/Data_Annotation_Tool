from bson import ObjectId
from pydantic import BaseModel
from datetime import date, datetime
from typing import Any, Dict

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    

class NotFoundError(Exception):
    pass

class ValidationError(Exception):
    pass

class SerializeHelper:
    @staticmethod
    def dates_to_datetime(obj: Dict[str, Any]) -> Dict[str, Any]:
        """
        Converteert alle datetime.date objecten in de dict naar datetime.datetime.
        PyMongo kan geen datetime.date opslaan, alleen datetime.datetime.
        """
        for k, v in obj.items():
            if isinstance(v, date) and not isinstance(v, datetime):
                obj[k] = datetime.combine(v, datetime.min.time())
            # Optioneel: recursief door nested dicts
            elif isinstance(v, dict):
                obj[k] = SerializeHelper.dates_to_datetime(v)
            # Optioneel: lijst van dicts
            elif isinstance(v, list):
                obj[k] = [
                    SerializeHelper.dates_to_datetime(i) if isinstance(i, dict) else i
                    for i in v
                ]
        return obj