# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # mailgun
    mailgun_domain: str
    mailgun_api_key: str
    mail_from: str
    frontend_base_url: str

    # aws s3
    aws_region: str
    s3_bucket: str
    s3_prefix: str = "images"
    aws_access_key_id: str
    aws_secret_access_key: str

        # Pydantic Settings config (v2-stijl)
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # of "forbid" als je heel strict wil zijn
    )

settings = Settings()


