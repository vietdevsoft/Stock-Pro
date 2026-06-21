from fastapi import APIRouter, Body
from services.product_service import ProductList
router = APIRouter(prefix="/view", tags=["products"])


@router.get("/products")
def get_list_products():
    result = ProductList().get_products()
    return result

@router.post("/products")
def create_product(payload: dict = Body(...)):
    result = ProductList().create_product(payload)
    return result

@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    result = ProductList().delete_product(product_id)
    return result


@router.get("/categories")
def get_categories():
    result = ProductList().get_categories()
    return result

@router.post("/categories")
def create_category(payload: dict = Body(...)):
    result = ProductList().create_category(payload)
    return result

@router.delete("/categories/{category_id}")
def delete_category(category_id: int):
    result = ProductList().delete_category(category_id)
    return result

@router.get("/products/{product_id}/stock")
def get_product_quantity(product_id: int):
    result = ProductList().get_product_stock(product_id)
    return result

@router.get("/products/transactions")
def get_transaction_history():
    result = ProductList().get_transaction()
    return result

@router.post("/products/transactions")
def create_transaction(payload: dict = Body(...)):
    result = ProductList().create_transaction(payload)
    return result



@router.delete("/users/{email}")
def delete_user(email: str):
    result = ProductList().delete_user(email)
    return result
