class AppException(Exception):
    """Base application exception."""


class DatabaseUnavailableError(AppException):
    """Raised when the configured database is missing or unreachable."""


class UnsupportedFileTypeError(AppException):
    """Raised when uploaded file type is unsupported."""


class GeminiResponseError(AppException):
    """Raised when Gemini response is invalid or missing JSON."""
