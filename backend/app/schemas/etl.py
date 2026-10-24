from typing import Any

from pydantic import BaseModel, Field, field_validator


class EtlIntrospectResponse(BaseModel):
    live_data_profile: dict[str, Any]
    message: str


class EtlExecuteRequest(BaseModel):
    instruction: str = Field(min_length=3, description="Demande ETL en langage naturel")

    @field_validator("instruction")
    @classmethod
    def instruction_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("instruction must not be blank")
        return value


class EtlExecuteResponse(BaseModel):
    instruction: str
    sql: str
    explanation: str
    row_count: int
    rows: list[dict[str, Any]]
    summary_md: str
    stored_in_pipeline: bool = True
