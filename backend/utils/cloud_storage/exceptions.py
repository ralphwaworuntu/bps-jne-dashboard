class CloudStorageError(Exception):
    """Gagal koneksi / upload / download object store."""


class ColdStorageUnavailable(CloudStorageError):
    """Detail dingin tidak bisa di-hydrate (cloud down / belum dikonfigurasi)."""
