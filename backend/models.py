from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship

class UserBase(SQLModel):
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    role: str = Field(default="user")  # 'admin', 'user', 'viewer'
    department: Optional[str] = None
    shift: Optional[str] = None # 'Shift 1', 'Shift 2', etc.

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    issues: List["DailyIssue"] = Relationship(back_populates="user")
    correction_requests: List["CorrectionRequest"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")

class CorrectionAttachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="correctionrequest.id")
    file_path: str
    filename: str
    attachment_type: str = Field(default="branch") # "branch" (dummy svg) or "sco" (uploaded proof)
    
    request: Optional["CorrectionRequest"] = Relationship(back_populates="attachments")

class CorrectionRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entry_date: datetime = Field(default_factory=datetime.utcnow)
    
    awb: str
    address_1: Optional[str] = None
    address_2: Optional[str] = None
    coding_awal: str
    kecamatan_awal: str
    coding_akhir: str
    kecamatan_akhir: str
    alasan: str
    
    status: str = Field(default="Submitted") # Submitted, Approved, Rejected, Done
    rejection_reason: Optional[str] = None
    
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="correction_requests")
    attachments: List[CorrectionAttachment] = Relationship(back_populates="request")

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    shift: Optional[str] = None

class UserLogin(SQLModel):
    email: str
    password: str

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    email: Optional[str] = None


# 1. Define Attachment Table First (so we can refer to it)
class DailyIssueAttachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    issue_id: int = Field(foreign_key="dailyissue.id")
    file_path: str
    filename: str
    
    issue: Optional["DailyIssue"] = Relationship(back_populates="attachments")

# 2. Define DailyIssue Base
class DailyIssueBase(SQLModel):
    issue_number: str = Field(unique=True, index=True)
    wilayah: str
    zona: str
    date: datetime = Field(default_factory=datetime.now)
    shift: str
    divisi: str
    process_type: str = Field(default="Lastmile")
    awb: Optional[str] = None
    description: str
    
    internal_constraint: Optional[str] = None
    external_constraint: Optional[str] = None
    
    action_taken: str
    solution_recommendation: str
    due_date: datetime
    status: str = Field(default="Open")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

# 3. Define DailyIssue Table
class DailyIssue(DailyIssueBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    user: Optional[User] = Relationship(back_populates="issues")
    attachments: List[DailyIssueAttachment] = Relationship(back_populates="issue")

# 4. Define DailyIssue Read (for Response)
class DailyIssueRead(DailyIssueBase):
    id: int
    attachments: List[DailyIssueAttachment] = []

class FinanceUpload(SQLModel, table=True):
    """Arsip upload Kelola Transaksi (rekening koran / bukti) per user."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str = Field(index=True)  # rekening_koran | bukti_transaksi
    original_filename: str
    stored_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HCCandidateApplication(SQLModel, table=True):
    """Pengajuan calon karyawan (pipeline rekrutmen)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    nama: str = Field(index=True)
    posisi: str = Field(index=True)
    cabang: str = Field(index=True)
    no_hp: str
    email: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_lahir: Optional[str] = None  # disimpan string agar fleksibel format input
    pendidikan_terakhir: Optional[str] = None
    pengalaman_singkat: Optional[str] = None
    sumber: str = Field(default="Internal", index=True)  # Walk-in/Referral/Job Portal/Internal
    status: str = Field(default="Baru", index=True)  # Baru/Screening/Interview/Offer/Diterima/Ditolak
    catatan: Optional[str] = None


class HCCandidateCreate(SQLModel):
    nama: str
    posisi: str
    cabang: str
    no_hp: str
    email: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pendidikan_terakhir: Optional[str] = None
    pengalaman_singkat: Optional[str] = None
    sumber: Optional[str] = "Internal"
    status: Optional[str] = "Baru"
    catatan: Optional[str] = None


class HCCandidateRead(SQLModel):
    id: int
    created_at: datetime
    created_by_user_id: Optional[int] = None
    nama: str
    posisi: str
    cabang: str
    no_hp: str
    email: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    pendidikan_terakhir: Optional[str] = None
    pengalaman_singkat: Optional[str] = None
    sumber: str
    status: str
    catatan: Optional[str] = None


class HCKasbonApplication(SQLModel, table=True):
    """Pengajuan kasbon karyawan."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)

    nama_karyawan: str = Field(index=True)
    nik: str = Field(index=True)
    divisi: str = Field(index=True)
    nominal: int
    tenor_bulan: int
    alasan: str
    tanggal_pengajuan: datetime = Field(default_factory=datetime.utcnow, index=True)
    status: str = Field(default="Diajukan", index=True)  # Diajukan/Disetujui/Ditolak/Lunas
    sisa: int
    catatan: Optional[str] = None


class HCKasbonCreate(SQLModel):
    nama_karyawan: str
    nik: str
    divisi: str
    nominal: int
    tenor_bulan: int
    alasan: str
    catatan: Optional[str] = None


class HCKasbonRead(SQLModel):
    id: int
    created_at: datetime
    created_by_user_id: Optional[int] = None
    nama_karyawan: str
    nik: str
    divisi: str
    nominal: int
    tenor_bulan: int
    alasan: str
    tanggal_pengajuan: datetime
    status: str
    sisa: int
    catatan: Optional[str] = None

class SalesInvoice(SQLModel, table=True):
    """Invoice header untuk Tracking Invoice."""
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_no: str = Field(index=True, unique=True)
    invoice_date: datetime = Field(default_factory=datetime.utcnow, index=True)
    top_days: int = Field(default=30)  # TOP (hari)
    periode: str = Field(default="")
    billed_customer_id: str = Field(index=True)
    billed_customer_name: str
    billed_address: str
    billed_phone: str
    nominal_total: int


class SalesInvoiceItem(SQLModel, table=True):
    """Line item invoice."""
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="salesinvoice.id", index=True)
    line_no: int
    description: str
    amount: int


class SalesInvoiceSummary(SQLModel, table=True):
    """Ringkasan nilai invoice (seperti di dokumen invoice)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="salesinvoice.id", index=True, unique=True)
    gross_total: int
    discount: int = Field(default=0)
    total_after_discount: int
    tax_base: int
    vat: int = Field(default=0)
    insurance: int = Field(default=0)
    stamp: int = Field(default=0)
    total_paid: int = Field(default=0)
    be_regarded_as: str = Field(default="")


class SalesInvoiceSummaryRead(SQLModel):
    gross_total: int
    discount: int
    total_after_discount: int
    tax_base: int
    vat: int
    insurance: int
    stamp: int
    total_paid: int
    be_regarded_as: str


class SalesInvoiceTaxInfo(SQLModel, table=True):
    """Info faktur pajak / NPWP untuk invoice."""
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="salesinvoice.id", index=True, unique=True)
    nomor_seri_faktur_pajak: str = Field(default="")
    npwp_id: str = Field(default="")
    npwp_name: str = Field(default="")
    npwp_address: str = Field(default="")


class SalesInvoiceTaxInfoRead(SQLModel):
    nomor_seri_faktur_pajak: str
    npwp_id: str
    npwp_name: str
    npwp_address: str


class SalesInvoiceItemRead(SQLModel):
    no: int
    description: str
    amount: int


class SalesInvoiceRead(SQLModel):
    invoice_no: str
    nominal_total: int
    invoice_date: datetime
    top_days: int
    due_date: datetime
    periode: str
    billed_to: dict
    items: list[SalesInvoiceItemRead]
    summary: SalesInvoiceSummaryRead
    tax_info: SalesInvoiceTaxInfoRead
    payment_status: str  # Lunas | Belum Lunas


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=True) # Nullable for global notifications? Or specific user. Let's make it specific for now based on plan, but plan said maybe global. Let's assume nullable = Global/System.
    title: str
    message: str
    type: str = Field(default="info") # success, error, info, warning
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="notifications")

