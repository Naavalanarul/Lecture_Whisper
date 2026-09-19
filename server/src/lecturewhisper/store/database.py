from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Generator

from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine

DEFAULT_DB_PATH = Path.home() / ".lecturewhisper" / "lecturewhisper.db"

def _enable_wal(dbapi_connection: sqlite3.Connection, connection_record: object) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.close()

def get_engine(db_path: Path | str = DEFAULT_DB_PATH):
    db_path_str = str(db_path)
    
    if db_path_str != "sqlite:///:memory:":
        path_obj = Path(db_path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{path_obj}"
    else:
        url = db_path_str
        
    engine = create_engine(url, echo=False)
    event.listen(engine, "connect", _enable_wal)
    
    return engine

def create_tables(engine) -> None:
    SQLModel.metadata.create_all(engine)

def get_session(engine) -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


_default_engine = None


def get_default_engine():
    global _default_engine
    if _default_engine is None:
        _default_engine = get_engine()
        create_tables(_default_engine)
    return _default_engine


def get_db() -> Generator[Session, None, None]:
    engine = get_default_engine()
    with Session(engine) as session:
        yield session
