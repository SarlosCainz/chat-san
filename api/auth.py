from datetime import datetime
import json
from io import BytesIO
import urllib.parse
import base64
import hmac
import hashlib

from fastapi import APIRouter, Depends, status, HTTPException, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode
import requests

from models import Token
from api.config import settings
from api.util import get_logger, get_kids

logger = get_logger()
kids = get_kids(settings.auth_jwks_file)
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_valid_token(id_token: str = Depends(oauth2_scheme)) -> str:
    return parse_token(id_token)


# OpenIDから受領した認可コードよりトークンを取得するコールバック
@router.post("/token", response_model=Token)
def callback(code: str = Form()):
    params = {
        "grant_type": "authorization_code",
        "code": urllib.parse.unquote(code),
        "redirect_uri": settings.auth_redirect_uri,
    }
    result = token_endpoint(params)
    logger.debug(result)

    access_token = result.get("access_token")
    id_token = result.get("id_token")
    nonce = None
    if id_token:
        claims = jwt.get_unverified_claims(id_token)
        logger.debug(claims)
        nonce = claims.get("nonce")

    token = Token(
        nonce=nonce,
        id_token=id_token,
        access_token=access_token,
        refresh_token=result.get("refresh_token"),
        token_type=result.get("token_type")
    )

    return token


@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str = Form()):
    params = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    result = token_endpoint(params)
    token = Token(
        id_token=result.get("id_token"),
        access_token=result.get("access_token"),
        token_type=result.get("token_type"),
    )

    return token


@router.post("/logout")
def logout(token: str = Form()):
    data = {
        "token": urllib.parse.unquote(token),
    }
    res = requests.post(url=settings.auth_revoke_endpoint, data=data)
    if res.status_code != 200:
        logger.error(res.text)


def token_endpoint(params):
    params["client_id"] = settings.auth_client_id
    params["client_secret"] = settings.auth_client_secret
    data = urllib.parse.urlencode(params)
    headers = {
        "content-type": "application/x-www-form-urlencoded"
    }

    res = requests.post(url=settings.auth_token_endpoint, headers=headers, data=data)
    if res.status_code != 200:
        logger.error(res.text)
        raise HTTPException(status_code=res.status_code, detail=res.text)

    result = json.loads(res.text)

    return result


# def get_user(id_token) -> models.User:
#     claims = jwt.get_unverified_claims(id_token)
#     return models.User(
#         username=claims.get("cognito:username", claims.get("username")),
#         email=claims.get("email"),
#         full_name=f'{claims.get("family_name")} {claims.get("given_name")}',
#         picture=claims.get("picture"),
#         groups=claims.get("cognito:groups", []),
#         employee_no=claims.get("custom:employee_no", None),
#         mail_notification=claims.get("custom:mail_notification", True),
#         project=claims.get("custom:project", 5801)
#     )


def parse_token(token: str) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        claims = jwt.get_unverified_claims(token)

        # トークンヘッダーより署名に使われた鍵のIDを取得
        header = jwt.get_unverified_header(token)
        kid = header["kid"]

        # 鍵を用いてトークンの正当性を検証
        message, encoded_signature = token.rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode())
        hmac_key = jwk.construct(kids[kid])
        verify = hmac_key.verify(message.encode(), decoded_signature)

        if verify:
            # 正当なトークンの場合、audと有効期限を検証
            if claims["token_use"] != "id" or settings.auth_client_id != claims["aud"]:
                raise credentials_exception

            now = int(datetime.now().timestamp())
            if now > claims["exp"]:
                # 期限切れ
                credentials_exception.detail = "expired"
                raise credentials_exception
        else:
            # 不正なトークン
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return token
