from pydantic import BaseModel, conint, constr, HttpUrl, EmailStr

RoomNum = conint(ge=1, le=9)


class Connection(BaseModel):
    id: str
    name: constr(max_length=20)
    room: RoomNum


class Room(BaseModel):
    num: conint(ge=1, le=9)
    title: constr(max_length=20)
    connections: list[RoomNum]


class Token(BaseModel):
    id_token: str = None
    nonce: str = None
    access_token: str = None
    refresh_token: str = None
    token_type: str = None


JWK = dict[str, str]


class JWKS(BaseModel):
    keys: list[JWK]


class JWTAuthorizationCredentials(BaseModel):
    jwt_token: str
    header: dict[str, str]
    claims: dict[str, str]
    signature: str
    message: str
