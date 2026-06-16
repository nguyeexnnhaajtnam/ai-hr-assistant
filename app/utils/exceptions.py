class AppException(Exception):
    """Base application exception."""


class UnsupportedFileTypeError(AppException):
    """Raised when uploaded file type is unsupported."""


class GeminiResponseError(AppException):
    """Raised when Gemini response is invalid or missing JSON."""
