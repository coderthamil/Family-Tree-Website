import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, FileResponse

from app.config import get_settings
from app.database import engine
from app.models import *  # noqa: F401,F403 — ensures all models are registered with Base

from app.routes import auth, persons, families, tree, import_, relationships, timeline, export_
from app.admin.dashboard import router as admin_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads directory exists
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield
    await engine.dispose()


app = FastAPI(
    title="Family Tree API",
    description="Genealogy platform — parse GenoPro files, manage family data, visualize trees.",
    version="1.0.0",
    docs_url=None,           # We serve a custom dark-themed Swagger
    redoc_url="/redoc",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)


# ── Inject Bearer security scheme into OpenAPI spec ──────────────────────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {})
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    # Apply security globally to all operations
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploaded profile pictures) ─────────────────────────────────
uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(persons.router)
app.include_router(families.router)
app.include_router(tree.router)
app.include_router(import_.router)
app.include_router(relationships.router)
app.include_router(timeline.router)
app.include_router(export_.router)
app.include_router(admin_router)


# ── Custom dark-themed Swagger UI ─────────────────────────────────────────────
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return HTMLResponse("""
<!DOCTYPE html>
<html>
<head>
  <title>Family Tree API — Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { background: #00171F; margin: 0; }
    .swagger-ui { background: #00171F; }
    .swagger-ui .topbar { background: #003459; border-bottom: 2px solid #00A7E1; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #00A7E1; font-family: 'Inter', sans-serif; }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info a { color: #c0d8e4; }
    .swagger-ui .opblock-tag { color: #00A7E1; border-bottom: 1px solid #007EA7; }
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path { color: #ffffff; }
    .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal p { color: #c0d8e4; }
    .swagger-ui .opblock.opblock-get { background: rgba(0,167,225,0.05); border-color: #007EA7; }
    .swagger-ui .opblock.opblock-post { background: rgba(0,52,89,0.3); border-color: #003459; }
    .swagger-ui .opblock.opblock-delete { background: rgba(200,50,50,0.1); border-color: #aa3333; }
    .swagger-ui .opblock.opblock-patch { background: rgba(0,126,167,0.1); border-color: #007EA7; }
    .swagger-ui .scheme-container { background: #00171F; box-shadow: none; }
    .swagger-ui section.models { background: #00171F; }
    .swagger-ui .model-box { background: #003459; }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #00A7E1; }
    .swagger-ui .parameter__name, .swagger-ui .parameter__type { color: #c0d8e4; }
    .swagger-ui .btn.execute { background: #00A7E1; border-color: #00A7E1; color: #00171F; font-weight: 700; }
    .swagger-ui .btn.authorize { background: #007EA7; border-color: #007EA7; color: white; }
    .swagger-ui input, .swagger-ui select, .swagger-ui textarea { background: #003459; color: white; border: 1px solid #007EA7; }
    .swagger-ui .response-col_status { color: #00A7E1; }
    .swagger-ui .highlight-code { background: #001824; }
    .swagger-ui .microlight { background: #001824; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
      persistAuthorization: true,
    })
  </script>
</body>
</html>
""")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


# ── Serve frontend static files in production ────────────────────────────────
static_path = Path("static")
if static_path.exists():
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")


@app.exception_handler(404)
async def custom_404_handler(request, exc):
    path = request.url.path
    # Do not serve index.html for API, docs, or upload routes
    if path.startswith((
        "/auth",
        "/persons",
        "/families",
        "/tree",
        "/import",
        "/relationships",
        "/timeline",
        "/export",
        "/admin",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/health",
        "/uploads"
    )):
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    static_index = Path("static/index.html")
    if static_index.exists():
        return FileResponse(static_index)
    return HTMLResponse("Not Found", status_code=404)
