from typing import Any, Literal

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    categoryId: int | None = None
    unitId: int | None = None
    quantity: int = Field(default=0, ge=0)
    minStock: int = Field(default=0, ge=0)
    price: float = Field(gt=0)
    image: str | None = None
    description: str | None = ""


class ProductUpdateRequest(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    categoryId: int | None = None
    unitId: int | None = None
    quantity: int | None = Field(default=None, ge=0)
    minStock: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)
    image: str | None = None
    description: str | None = None
    status: Literal["active", "inactive"] | None = None


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = ""


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: Literal["active", "inactive"] | None = None


class UnitCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=50)


class UnitUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    symbol: str | None = Field(default=None, max_length=50)


class InventoryTransactionRequest(BaseModel):
    productId: int | None = None
    code: str | None = None
    transactionType: Literal["import", "export"]
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    note: str | None = ""


class UserAdminUpdateRequest(BaseModel):
    role_id: int | None = None
    status: Literal["active", "pending", "inactive", "locked", "blocked", "deleted"] | None = None


class SiteSettingsRequest(BaseModel):
    siteName: str | None = Field(default=None, max_length=255)
    icon: str | None = None
    logo: str | None = None
    color: str | None = Field(default=None, max_length=30)
    desc: str | None = None
    extra: dict[str, Any] | None = None
