import boto3
from boto3.dynamodb.conditions import Key

from api.config import settings
from models import Connection, Room, RoomNum

dynamodb = boto3.resource("dynamodb", region_name=settings.region)
ConnectionTable = "Connection"
RoomTable = "Room"


def get_connection(id: str) -> Connection:
    table = dynamodb.Table(ConnectionTable)

    key = {
        "id": id,
    }
    res = table.get_item(Key=key)

    connection = None
    if "Item" in res:
        item = res["Item"]
        connection = Connection(**item)

    return connection


def put_connection(connection: Connection) -> None:
    table = dynamodb.Table(ConnectionTable)
    table.put_item(Item=connection.dict())


def delete_connection(connection: Connection) -> None:
    table = dynamodb.Table(ConnectionTable)

    key = {
        "id": connection.id,
    }
    table.delete_item(Key=key)


def get_room(num: int) -> Room:
    table = dynamodb.Table(RoomTable)

    key = {
        "num": num,
    }
    res = table.get_item(Key=key)

    room = None
    if "Item" in res:
        item = res["Item"]
        room = Room(**item)

    return room


def put_room(room: Room) -> None:
    table = dynamodb.Table(RoomTable)
    table.put_item(Item=room.dict())


def delete_room(room: Room) -> None:
    table = dynamodb.Table(RoomTable)

    key = {
        "num": room.num,
    }
    table.delete_item(Key=key)


def scan_room() -> list[Room]:
    rooms = []
    table = dynamodb.Table(RoomTable)

    res = table.scan()
    for item in res["Items"]:
        room = Room(**item)
        rooms.append(room)

    return rooms
