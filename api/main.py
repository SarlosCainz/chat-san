import json

from fastapi import FastAPI, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi_utils.inferring_router import InferringRouter
from fastapi_utils.cbv import cbv
from mangum import Mangum

from api.auth import router as auth_router, get_valid_token
from api.config import settings


app = FastAPI()
if settings.allow_origin is not None:
    app.add_middleware(CORSMiddleware, allow_origins=settings.allow_origin, allow_methods=["*"],
                       allow_credentials=True, allow_headers=["*"])
app.include_router(auth_router, tags=["auth"], prefix="/auth")

handler = Mangum(app)
