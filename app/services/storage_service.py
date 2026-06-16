from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def save_candidate_cv(self, *, candidate_id: UUID, upload_file: UploadFile) -> Path:
        safe_filename = Path(upload_file.filename or "uploaded_file").name
        target_dir = self.settings.local_upload_dir / "cvs" / str(candidate_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / safe_filename

        upload_file.file.seek(0)
        with target_path.open("wb") as output_file:
            output_file.write(upload_file.file.read())

        upload_file.file.seek(0)
        return target_path
