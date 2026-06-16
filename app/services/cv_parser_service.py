from io import BytesIO
from pathlib import Path

from docx import Document
from fastapi import UploadFile
from pypdf import PdfReader

from app.utils.exceptions import UnsupportedFileTypeError


class CVParserService:
    SUPPORTED_EXTENSIONS = {".pdf", ".docx"}

    def extract_text(self, upload_file: UploadFile) -> str:
        suffix = Path(upload_file.filename or "").suffix.lower()
        if suffix not in self.SUPPORTED_EXTENSIONS:
            raise UnsupportedFileTypeError("Only PDF and DOCX files are supported.")

        content = upload_file.file.read()
        upload_file.file.seek(0)

        if suffix == ".pdf":
            return self._extract_pdf(content)
        return self._extract_docx(content)

    def _extract_pdf(self, content: bytes) -> str:
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    def _extract_docx(self, content: bytes) -> str:
        document = Document(BytesIO(content))
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
        return "\n".join(paragraphs).strip()
