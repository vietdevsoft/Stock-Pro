from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from controllers import captcha_controller
from controllers import auth_controller
from controllers import profile_controller
from controllers import product_controller
from utils.security import JWT_Auth
from services.query_service import QueryDB

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

def load_info_data(request: Request):
    access_token = request.cookies.get("access_token")
    if access_token is None:
        return None

    payload = JWT_Auth().verify_access_token(access_token)

    if payload is None:
        return None

    user_id = payload.get("sub")
    role_id = payload.get("role_id")

    if user_id is None:
        return None

    user = QueryDB.query("SELECT full_name, avatar_url FROM users WHERE id = %s", (user_id,))
    user = dict(user) if user else {}

    return {
        "full_name": user.get("full_name"),
        "avatar_url": user.get("avatar_url"),
        "user_id": user_id,
        "role_id": role_id,
    }


def Render(request: Request, temp_name: str, context: dict | None = None):
    if context is None:
        context = {}

    info_data = load_info_data(request)
    context["is_logged_in"] = info_data is not None
    context["user_name"] = info_data["full_name"] if info_data else None
    context["user_avatar"] = info_data["avatar_url"] if info_data else None
    context["user_id"] = info_data["user_id"] if info_data else None
    context["role_id"] = info_data["role_id"] if info_data else None

    response = templates.TemplateResponse(
        request=request,
        name=f"pages/{temp_name}",
        context=context,
    )

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response



@app.get("/")
def home(request: Request):
    return Render(request, "index.html", {"active_page": "home"})


@app.get("/register")
def register(request: Request):
    if load_info_data(request) is not None:
        return RedirectResponse(url="/")
    return Render(request, "register.html", {"active_page": "register"})


@app.get("/login")
def login(request: Request):
    if load_info_data(request) is not None:
        return RedirectResponse(url="/")
    return Render(request, "login.html", {"active_page": "login"})


@app.get("/forgot-password")
def forgot_password(request: Request):
    if load_info_data(request) is not None:
        return RedirectResponse(url="/")
    return Render(request, "forgot-password.html", {"active_page": "forgot-password"})


@app.get("/profile")
def profile(request: Request):
    info_data = load_info_data(request)

    if info_data is None:
        return RedirectResponse(url="/login", status_code=302)

    role_id = info_data.get("role_id")

    if role_id is None:
        return RedirectResponse(url="/login", status_code=302)

    role_id = str(role_id)

    if role_id in ["1", "3"]:
        return RedirectResponse(url="/admin", status_code=302)

    # User thường
    if role_id == "2":
        return Render(request, "profile.html", {"active_page": "profile"})

    return RedirectResponse(url="/login", status_code=302)

@app.get("/admin")
def admin(request: Request):
    info_data = load_info_data(request)

    if info_data is None:
        return RedirectResponse(url="/login", status_code=302)

    role_id = info_data.get("role_id")

    if role_id is None:
        return RedirectResponse(url="/login", status_code=302)

    if str(role_id) in ["1", "3"]:
        return Render(request, "admin-dashboard.html", {"active_page": "admin"})

    return RedirectResponse(url="/profile", status_code=302)

@app.get("/products")
def products(request: Request):
    return Render(request, "products.html", {"active_page": "products"})

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools_config():
    return {}


app.include_router(captcha_controller.router)
app.include_router(auth_controller.router)
app.include_router(profile_controller.router)
app.include_router(product_controller.router)
