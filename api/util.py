import json
import logging
from api.config import settings
from models import JWKS


def get_logger(name=__name__, debug=settings.debug):
    logger = logging.getLogger(name)
    if not logger.hasHandlers():
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(funcName)s: %(message)s"))
        handler.setLevel(logging.DEBUG if debug else logging.INFO)
        logger.addHandler(handler)

    logger.setLevel(logging.DEBUG if debug else logging.INFO)
    logger.propagate = False

    return logger


def get_kids(jwks_file: str):
    with open(jwks_file, "r") as file:
        jwks: JWKS = json.load(file)
        kid_to_jwk = {jwk["kid"]: jwk for jwk in jwks["keys"]}

    return kid_to_jwk
