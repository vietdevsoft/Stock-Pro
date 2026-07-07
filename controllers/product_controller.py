from fastapi import APIRouter, Depends, Query

from schemas.admin_schema import (
    CategoryCreateRequest,
    CategoryUpdateRequest,
    InventoryTransactionRequest,
    ProductCreateRequest,
    ProductUpdateRequest,
    SiteSettingsRequest,
    UnitCreateRequest,
    UnitUpdateRequest,
    UserAdminUpdateRequest,
)
from services.product_service import ProductList
from utils.admin_auth import require_admin_user, require_super_admin_user


router = APIRouter(prefix="/view", tags=["products"])


@router.get("/products")
def get_list_products(
    q: str | None = None,
    category_id: int | None = Query(default=None, alias="categoryId"),
    status: str | None = None,
    page: int = 1,
    page_size: int = 500,
):
    return ProductList().get_products(q=q, category_id=category_id, status=status, page=page, page_size=page_size)


@router.post("/products")
def create_product(data: ProductCreateRequest, actor=Depends(require_admin_user)):
    return ProductList().create_product(data, actor=actor)


@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductUpdateRequest, actor=Depends(require_admin_user)):
    return ProductList().update_product(product_id, data, actor=actor)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, actor=Depends(require_admin_user)):
    return ProductList().delete_product(product_id, actor=actor)


@router.get("/categories")
def get_categories(
    q: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 500,
):
    return ProductList().get_categories(q=q, status=status, page=page, page_size=page_size)


@router.post("/categories")
def create_category(data: CategoryCreateRequest, actor=Depends(require_admin_user)):
    return ProductList().create_category(data, actor=actor)


@router.put("/categories/{category_id}")
def update_category(category_id: int, data: CategoryUpdateRequest, actor=Depends(require_admin_user)):
    return ProductList().update_category(category_id, data, actor=actor)


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, actor=Depends(require_admin_user)):
    return ProductList().delete_category(category_id, actor=actor)


@router.get("/units")
def get_units(
    q: str | None = None,
    page: int = 1,
    page_size: int = 500,
    actor=Depends(require_admin_user),
):
    return ProductList().get_unit(q=q, page=page, page_size=page_size)


@router.post("/units")
def create_unit(data: UnitCreateRequest, actor=Depends(require_admin_user)):
    return ProductList().create_unit(data, actor=actor)


@router.put("/units/{unit_id}")
def update_unit(unit_id: int, data: UnitUpdateRequest, actor=Depends(require_admin_user)):
    return ProductList().update_unit(unit_id, data, actor=actor)


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: int, actor=Depends(require_admin_user)):
    return ProductList().delete_unit(unit_id, actor=actor)


@router.get("/products/{product_id}/stock")
def get_product_quantity(product_id: int, actor=Depends(require_admin_user)):
    return ProductList().get_product_stock(product_id)


@router.get("/products/transactions")
def get_transaction_history(
    q: str | None = None,
    transaction_type: str | None = Query(default=None, alias="type"),
    date: str | None = None,
    page: int = 1,
    page_size: int = 500,
    actor=Depends(require_admin_user),
):
    return ProductList().get_transaction(
        q=q,
        transaction_type=transaction_type,
        date=date,
        page=page,
        page_size=page_size,
    )


@router.post("/products/transactions")
def create_transaction(data: InventoryTransactionRequest, actor=Depends(require_admin_user)):
    return ProductList().create_transaction(data, actor=actor)


@router.get("/users")
def get_users(
    q: str | None = None,
    role_id: int | None = Query(default=None, alias="roleId"),
    status: str | None = None,
    page: int = 1,
    page_size: int = 500,
    actor=Depends(require_super_admin_user),
):
    return ProductList().get_users(q=q, role_id=role_id, status=status, page=page, page_size=page_size)


@router.patch("/users/{user_id}")
def update_user(user_id: int, data: UserAdminUpdateRequest, actor=Depends(require_super_admin_user)):
    return ProductList().update_user(user_id, data, actor=actor)


@router.delete("/users/{email}")
def delete_user(email: str, actor=Depends(require_super_admin_user)):
    return ProductList().delete_user(email, actor=actor)


@router.get("/audit-logs")
def get_audit_logs(
    q: str | None = None,
    action: str | None = None,
    entity_type: str | None = Query(default=None, alias="entityType"),
    page: int = 1,
    page_size: int = 100,
    actor=Depends(require_super_admin_user),
):
    return ProductList().get_audit_logs(
        q=q,
        action=action,
        entity_type=entity_type,
        page=page,
        page_size=page_size,
    )


@router.get("/settings")
def get_site_settings(actor=Depends(require_super_admin_user)):
    return ProductList().get_site_settings()


@router.put("/settings")
def update_site_settings(data: SiteSettingsRequest, actor=Depends(require_super_admin_user)):
    return ProductList().update_site_settings(data, actor=actor)
