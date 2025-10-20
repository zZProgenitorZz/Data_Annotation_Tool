from bson import ObjectId
from datetime import date, datetime
from typing import Any, Dict
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler: GetCoreSchemaHandler):
        # Vertel Pydantic dat dit eigenlijk een string is
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.no_info_plain_validator_function(cls.validate)
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
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