"""Skema & normalisasi kolom Master Data Operations."""
from __future__ import annotations

from typing import Dict, List, Optional

import pandas as pd

KIND_CODING_NASIONAL = "coding_nasional"
KIND_CODING_NTT = "coding_ntt"
KIND_CAKUPAN_DELIVERY_KOE = "cakupan_delivery_koe"
KIND_SLA_LAZADA = "sla_lazada"
KIND_ORIGIN_GROUPING_LAZADA = "origin_grouping_lazada"
KIND_SLA_SHOPEE = "sla_shopee"
KIND_SERVICE = "service"
KIND_ACCOUNT = "account"
KIND_ID_KURIR = "id_kurir"
KIND_USERNAME_INBOUND = "username_inbound"
KIND_STATUS_CODING_1 = "status_coding_1"
KIND_STATUS_CODING_2 = "status_coding_2"
KIND_CODING_AUTOCLOSE = "coding_autoclose"
KIND_CODING_FIRSTMILE = "coding_firstmile"
KIND_USERNAME_MANIFEST = "username_manifest"

MASTER_DATA_KINDS = {
    KIND_CODING_NASIONAL,
    KIND_CODING_NTT,
    KIND_CAKUPAN_DELIVERY_KOE,
    KIND_SLA_LAZADA,
    KIND_ORIGIN_GROUPING_LAZADA,
    KIND_SLA_SHOPEE,
    KIND_SERVICE,
    KIND_ACCOUNT,
    KIND_ID_KURIR,
    KIND_USERNAME_INBOUND,
    KIND_STATUS_CODING_1,
    KIND_STATUS_CODING_2,
    KIND_CODING_AUTOCLOSE,
    KIND_CODING_FIRSTMILE,
    KIND_USERNAME_MANIFEST,
}

KIND_LABELS = {
    KIND_CODING_NASIONAL: "Database Coding Nasional",
    KIND_CODING_NTT: "Database Coding NTT",
    KIND_CAKUPAN_DELIVERY_KOE: "Database Cakupan Area Delivery KOE",
    KIND_SLA_LAZADA: "Database SLA LAZADA",
    KIND_ORIGIN_GROUPING_LAZADA: "Origin Grouping Lazada",
    KIND_SLA_SHOPEE: "Database SLA SHOPEE",
    KIND_SERVICE: "Database SERVICE",
    KIND_ACCOUNT: "Database Account",
    KIND_ID_KURIR: "Database ID KURIR",
    KIND_USERNAME_INBOUND: "Database USERNAME INBOUND",
    KIND_STATUS_CODING_1: "Database Status Coding 1",
    KIND_STATUS_CODING_2: "Database Status Coding 2",
    KIND_CODING_AUTOCLOSE: "Database Coding AUTOCLOSE",
    KIND_CODING_FIRSTMILE: "Database Coding Firstmile",
    KIND_USERNAME_MANIFEST: "Database Username Manifest",
}

CODING_NTT_COLUMNS = [
    "Coding",
    "Provinsi",
    "Kota / Kabupaten",
    "Kecamatan",
    "Kelurahan",
    "Kode POS",
    "Status Cabang",
    "ZONA",
    "CABANG",
    "WILAYAH GROUPING",
    "Gate Inbound",
    "Wilayah Delivery",
    "Jadwal Delivery",
]

# Coding Nasional: skema referensi coding wilayah nasional.
CODING_NASIONAL_COLUMNS = [
    "SYSCODE",
    "CODE",
    "REGIONAL",
    "KABUPATEN",
    "KECAMATAN",
    "STATUS",
    "THREE LETTER CODE",
    "MANIFEST DOMESTIC",
    "MANIFEST INTERCITY",
    "ZONA TARIF (PPDD)",
    "ZONA DELEVERY (QCE)",
    "RING ORIGIN",
    "WILAYAH",
]

SLA_LAZADA_ORIGIN_GROUPING_COLUMNS = [
    "3LC ORIGIN",
    "ORIGIN GROPUP",
    "ORIGIN",
]

SLA_LAZADA_TABLE_COLUMNS = [
    "CABANG",
    "DESTINATION",
    "3LC",
    "Zona",
    "Regional",
    "DESTINATION GROUP LZD",
    "FIRST ATTEMP ( REG & Jabo, Jabar, Banten )",
    "FIRST ATTEMP ( REG & Jateng, Jatim, Bali )",
    "FIRST ATTEMP ( REG & Others )",
    "REKOMENDASI RETURN ( REG & Jabo, Jabar, Banten )",
    "REKOMENDASI RETURN ( REG & Jateng, Jatim, Bali )",
    "REKOMENDASI RETURN ( REG & Others )",
    "REKOMENDASI OM ( REG & Jabo, Jabar, Banten )",
    "REKOMENDASI OM ( REG & Jateng, Jatim, Bali )",
    "REKOMENDASI OM ( REG & Others )",
    "BREACH ( REG & Jabo, Jabar, Banten)",
    "BREACH ( REG & Jateng, Jatim, Bali)",
    "BREACH ( REG & Others)",
    "FIRST ATTEMP ( JTR & Jabo, Jabar, Banten )",
    # Duplikat nama di sumber Excel → disimpan dengan suffix .1
    "FIRST ATTEMP ( JTR & Jabo, Jabar, Banten ).1",
    "FIRST ATTEMP ( JTR & Others )",
    "REKOMENDASI RETURN ( JTR & Jabo, Jabar, Banten )",
    "REKOMENDASI RETURN ( JTR & Jateng, Jatim, Bali )",
    "REKOMENDASI RETURN ( JTR & Others )",
    "REKOMENDASI OM ( JTR & Jabo, Jabar, Banten )",
    "REKOMENDASI OM ( JTR & Jateng, Jatim, Bali )",
    "REKOMENDASI OM ( JTR & Others )",
    "BREACH ( JTR & Jabo, Jabar, Banten )",
    "BREACH ( JTR & Jateng, Jatim, Bali )",
    "BREACH ( JTR & Others )",
]

CAKUPAN_DELIVERY_KOE_COLUMNS = [
    "Coding",
    "Provinsi",
    "Kota / Kabupaten",
    "Kecamatan",
    "Kelurahan",
    "Kode POS",
    "Status Cabang",
    "Zona EXISTING",
    "Cabang",
    "Wilayah Grouping",
    "Gate Inbound",
    "Area Delivery",
    "Jadwal Penerusan",
    "Jadwal Penerusan ke Agen",
    "Transportasi",
    "ETD",
    "ETA",
    "Jadwal Delivery",
    "Nama Kurir",
    "ID Kurir",
    "Ket",
    "Keterangan",
]

SLA_SHOPEE_COLUMNS = [
    "KOLOM DUMMY",
    "DEST_KCU",
    "DEST_REGION",
    "SERVICE",
    "ORIGIN_CODE",
    "DEST_CODE",
    "SLA_LDR",
    "SLA_BREACH",
    "SLA Return",
]

SERVICE_COLUMNS = [
    "GROUPING",
    "GROUPING SERVICE",
]

ACCOUNT_COLUMNS = [
    "No. Account",
    "Cust Name",
    "Cust Grouping",
    "COD/Non COD",
    "Hold/ Not Hold",
    "SLA Hold",
    "SLA Breach",
    "CUST_INDUSTRY_NEW",
    "SLA Breach Zona A & B",
    "SLA Breach Zona C & D",
    "TGL UPDATE ACCOUNT",
]

ID_KURIR_COLUMNS = [
    "Courier ID",
    "Cabang",
    "Agen",
    "Name Courier",
]

USERNAME_INBOUND_COLUMNS = [
    "Username",
    "Gate Inbound",
]

# Duplikat header "-" di sumber Excel → disimpan sebagai "-" dan "-.1"
STATUS_CODING_1_COLUMNS = [
    "STATUS CODE",
    "CLOSE/OPEN",
    "AREA CHECK POINT",
    "GROUPING",
    "TRIGGER STATUS",
    "IDENTIFIKASI",
    "DESCRIPTION",
    "DEFINISI (Bahasa Indonesia)",
    "DISPLAYED AT ORION",
    "-",
    "DISPLAYED AT WEBSITE",
    "-.1",
    "DISPLAYED AT MYJNE",
    "SMS NOTIFICATION SCRIPT",
    "STATUS POD",
    "STATUS FOLLOW UP",
]

STATUS_CODING_2_COLUMNS = [
    "AREA CHECK POINT",
    "GROUPING",
    "IDENTIFIKASI",
    "STATUS CODE",
    "DESCRIPTION",
    "DEFINISI (Bahasa Indonesia)",
    "DISPLAYED AT ORION",
    "DISPLAYED AT WEBSITE",
    "DISPLAYED AT MYJNE",
    "STATUS POD",
]

CODING_AUTOCLOSE_COLUMNS = [
    "CODE AUTOCLOSE",
    "SLA AUTOCLOSE",
    "SLA REMINDER",
]

# Ekstraksi_Heading_Kolom.md — typo sumber "WILAYAH GOUPING" → canonical WILAYAH GROUPING
CODING_FIRSTMILE_COLUMNS = [
    "Coding",
    "Provinsi",
    "Kota / Kabupaten",
    "Kecamatan",
    "Kelurahan",
    "Kode POS",
    "Status Cabang",
    "ZONA",
    "CABANG",
    "WILAYAH GROUPING",
    "Gate Inbound",
    "Gate Outbound",
]

USERNAME_MANIFEST_COLUMNS = [
    "MANIFEST USER ID",
    "MANIFEST GATE",
]

KIND_COLUMNS: Dict[str, List[str]] = {
    KIND_CODING_NASIONAL: CODING_NASIONAL_COLUMNS,
    KIND_CODING_NTT: CODING_NTT_COLUMNS,
    KIND_CAKUPAN_DELIVERY_KOE: CAKUPAN_DELIVERY_KOE_COLUMNS,
    KIND_SLA_LAZADA: SLA_LAZADA_TABLE_COLUMNS,
    KIND_ORIGIN_GROUPING_LAZADA: SLA_LAZADA_ORIGIN_GROUPING_COLUMNS,
    KIND_SLA_SHOPEE: SLA_SHOPEE_COLUMNS,
    KIND_SERVICE: SERVICE_COLUMNS,
    KIND_ACCOUNT: ACCOUNT_COLUMNS,
    KIND_ID_KURIR: ID_KURIR_COLUMNS,
    KIND_USERNAME_INBOUND: USERNAME_INBOUND_COLUMNS,
    KIND_STATUS_CODING_1: STATUS_CODING_1_COLUMNS,
    KIND_STATUS_CODING_2: STATUS_CODING_2_COLUMNS,
    KIND_CODING_AUTOCLOSE: CODING_AUTOCLOSE_COLUMNS,
    KIND_CODING_FIRSTMILE: CODING_FIRSTMILE_COLUMNS,
    KIND_USERNAME_MANIFEST: USERNAME_MANIFEST_COLUMNS,
}


def _base_alias_map(columns: List[str]) -> Dict[str, str]:
    return {col.strip().lower(): col for col in columns}


_CODING_ALIAS: Dict[str, str] = _base_alias_map(CODING_NTT_COLUMNS)
_CODING_ALIAS.update({
    "no. coding": "Coding",
    "no coding": "Coding",
    "no_coding": "Coding",
    "nocoding": "Coding",
    "kota/kabupaten": "Kota / Kabupaten",
    "kota kabupaten": "Kota / Kabupaten",
    "kode_pos": "Kode POS",
    "kodepos": "Kode POS",
    "status_cabang": "Status Cabang",
    "zona": "ZONA",
    "zona existing": "ZONA",
    "zona_existing": "ZONA",
    "cabang": "CABANG",
    "wilayah grouping": "WILAYAH GROUPING",
    "wilayah_grouping": "WILAYAH GROUPING",
    # Typo umum di file sumber Excel Coding NTT
    "wilayah gouping": "WILAYAH GROUPING",
    "wilayah_gouping": "WILAYAH GROUPING",
    "wilayah gouping ": "WILAYAH GROUPING",
    "gate inbound": "Gate Inbound",
    "gate_inbound": "Gate Inbound",
    "wilayah delivery": "Wilayah Delivery",
    "wilayah_delivery": "Wilayah Delivery",
    "area delivery": "Wilayah Delivery",
    "area_delivery": "Wilayah Delivery",
    "jadwal delivery": "Jadwal Delivery",
    "jadwal_delivery": "Jadwal Delivery",
})

_CODING_NASIONAL_ALIAS: Dict[str, str] = _base_alias_map(CODING_NASIONAL_COLUMNS)
_CODING_NASIONAL_ALIAS.update({
    "syscode": "SYSCODE",
    "sys_code": "SYSCODE",
    "code": "CODE",
    "coding": "CODE",
    "regional": "REGIONAL",
    "kabupaten": "KABUPATEN",
    "kota / kabupaten": "KABUPATEN",
    "kota/kabupaten": "KABUPATEN",
    "kecamatan": "KECAMATAN",
    "status": "STATUS",
    "status cabang": "STATUS",
    "three letter code": "THREE LETTER CODE",
    "three_letter_code": "THREE LETTER CODE",
    "3lc": "THREE LETTER CODE",
    "manifest domestic": "MANIFEST DOMESTIC",
    "manifest_domestic": "MANIFEST DOMESTIC",
    "manifest intercity": "MANIFEST INTERCITY",
    "manifest_intercity": "MANIFEST INTERCITY",
    "zona tarif (ppdd)": "ZONA TARIF (PPDD)",
    "zona tarif ppdd": "ZONA TARIF (PPDD)",
    "zona_tarif_ppdd": "ZONA TARIF (PPDD)",
    "zona delevery (qce)": "ZONA DELEVERY (QCE)",
    "zona delivery (qce)": "ZONA DELEVERY (QCE)",
    "zona_delevery_qce": "ZONA DELEVERY (QCE)",
    "zona_delivery_qce": "ZONA DELEVERY (QCE)",
    "ring origin": "RING ORIGIN",
    "ring_origin": "RING ORIGIN",
    "wilayah": "WILAYAH",
    "wilayah grouping": "WILAYAH",
})

_CAKUPAN_ALIAS: Dict[str, str] = _base_alias_map(CAKUPAN_DELIVERY_KOE_COLUMNS)
_CAKUPAN_ALIAS.update({
    "no. coding": "Coding",
    "no coding": "Coding",
    "no_coding": "Coding",
    "nocoding": "Coding",
    "kota/kabupaten": "Kota / Kabupaten",
    "kota kabupaten": "Kota / Kabupaten",
    "kode_pos": "Kode POS",
    "kodepos": "Kode POS",
    "status_cabang": "Status Cabang",
    "zona": "Zona EXISTING",
    "zona existing": "Zona EXISTING",
    "zona_existing": "Zona EXISTING",
    "wilayah grouping": "Wilayah Grouping",
    "wilayah_grouping": "Wilayah Grouping",
    "gate inbound": "Gate Inbound",
    "gate_inbound": "Gate Inbound",
    "area delivery": "Area Delivery",
    "area_delivery": "Area Delivery",
    "wilayah delivery": "Area Delivery",
    "jadwal penerusan": "Jadwal Penerusan",
    "jadwal_penerusan": "Jadwal Penerusan",
    "jadwal penerusan ke agen": "Jadwal Penerusan ke Agen",
    "jadwal penerusan ke agent": "Jadwal Penerusan ke Agen",
    "jadwal_penerusan_ke_agen": "Jadwal Penerusan ke Agen",
    "jadwal delivery": "Jadwal Delivery",
    "jadwal_delivery": "Jadwal Delivery",
    "nama kurir": "Nama Kurir",
    "nama_kurir": "Nama Kurir",
    "id kurir": "ID Kurir",
    "id_kurir": "ID Kurir",
})

_SLA_LAZADA_ALIAS: Dict[str, str] = _base_alias_map(SLA_LAZADA_TABLE_COLUMNS)
_SLA_LAZADA_ALIAS.update({
    "destination group lzd": "DESTINATION GROUP LZD",
    "destination_group_lzd": "DESTINATION GROUP LZD",
    "zona": "Zona",
})

_ORIGIN_GROUPING_LAZADA_ALIAS: Dict[str, str] = _base_alias_map(
    SLA_LAZADA_ORIGIN_GROUPING_COLUMNS
)
_ORIGIN_GROUPING_LAZADA_ALIAS.update({
    "3lc origin": "3LC ORIGIN",
    "origin gropup": "ORIGIN GROPUP",
    "origin group": "ORIGIN GROPUP",
    "origin_group": "ORIGIN GROPUP",
})

_SLA_SHOPEE_ALIAS: Dict[str, str] = _base_alias_map(SLA_SHOPEE_COLUMNS)
_SLA_SHOPEE_ALIAS.update({
    "kolom dummy": "KOLOM DUMMY",
    "kolom_dummy": "KOLOM DUMMY",
    "dest kcu": "DEST_KCU",
    "dest_kcu": "DEST_KCU",
    "dest region": "DEST_REGION",
    "dest_region": "DEST_REGION",
    "origin code": "ORIGIN_CODE",
    "origin_code": "ORIGIN_CODE",
    "dest code": "DEST_CODE",
    "dest_code": "DEST_CODE",
    "sla ldr": "SLA_LDR",
    "sla_ldr": "SLA_LDR",
    "sla breach": "SLA_BREACH",
    "sla_breach": "SLA_BREACH",
    "sla return": "SLA Return",
    "sla_return": "SLA Return",
})

_SERVICE_ALIAS: Dict[str, str] = _base_alias_map(SERVICE_COLUMNS)
_SERVICE_ALIAS.update({
    "grouping": "GROUPING",
    "grouping service": "GROUPING SERVICE",
    "grouping_service": "GROUPING SERVICE",
})

_ACCOUNT_ALIAS: Dict[str, str] = _base_alias_map(ACCOUNT_COLUMNS)
_ACCOUNT_ALIAS.update({
    "no account": "No. Account",
    "no. account": "No. Account",
    "no_account": "No. Account",
    "cust name": "Cust Name",
    "cust_name": "Cust Name",
    "cust grouping": "Cust Grouping",
    "cust_grouping": "Cust Grouping",
    "cod/non cod": "COD/Non COD",
    "cod non cod": "COD/Non COD",
    "hold/ not hold": "Hold/ Not Hold",
    "hold / not hold": "Hold/ Not Hold",
    "hold not hold": "Hold/ Not Hold",
    "sla hold": "SLA Hold",
    "sla breach": "SLA Breach",
    "cust_industry_new": "CUST_INDUSTRY_NEW",
    "cust industry new": "CUST_INDUSTRY_NEW",
    "sla breach zona a & b": "SLA Breach Zona A & B",
    "sla breach zona a and b": "SLA Breach Zona A & B",
    "sla breach zona c & d": "SLA Breach Zona C & D",
    "sla breach zona c and d": "SLA Breach Zona C & D",
    "tgl update account": "TGL UPDATE ACCOUNT",
    "tgl_update_account": "TGL UPDATE ACCOUNT",
})

_ID_KURIR_ALIAS: Dict[str, str] = _base_alias_map(ID_KURIR_COLUMNS)
_ID_KURIR_ALIAS.update({
    "courier id": "Courier ID",
    "courier_id": "Courier ID",
    "id courier": "Courier ID",
    "id kurir": "Courier ID",
    "cabang": "Cabang",
    "agen": "Agen",
    "name courier": "Name Courier",
    "name_courier": "Name Courier",
    "nama courier": "Name Courier",
    "nama kurir": "Name Courier",
})

_USERNAME_INBOUND_ALIAS: Dict[str, str] = _base_alias_map(USERNAME_INBOUND_COLUMNS)
_USERNAME_INBOUND_ALIAS.update({
    "username": "Username",
    "user name": "Username",
    "gate inbound": "Gate Inbound",
    "gate_inbound": "Gate Inbound",
})

_STATUS_CODING_1_ALIAS: Dict[str, str] = _base_alias_map(STATUS_CODING_1_COLUMNS)
_STATUS_CODING_1_ALIAS.update({
    "status code": "STATUS CODE",
    "status_code": "STATUS CODE",
    "close/open": "CLOSE/OPEN",
    "close open": "CLOSE/OPEN",
    "area check point": "AREA CHECK POINT",
    "area_check_point": "AREA CHECK POINT",
    "grouping": "GROUPING",
    "trigger status": "TRIGGER STATUS",
    "trigger_status": "TRIGGER STATUS",
    "identifikasi": "IDENTIFIKASI",
    "description": "DESCRIPTION",
    "definisi (bahasa indonesia)": "DEFINISI (Bahasa Indonesia)",
    "definisi bahasa indonesia": "DEFINISI (Bahasa Indonesia)",
    "displayed at orion": "DISPLAYED AT ORION",
    "displayed at website": "DISPLAYED AT WEBSITE",
    "displayed at myjne": "DISPLAYED AT MYJNE",
    "sms notification script": "SMS NOTIFICATION SCRIPT",
    "status pod": "STATUS POD",
    "status follow up": "STATUS FOLLOW UP",
    "status_follow_up": "STATUS FOLLOW UP",
    "-.1": "-.1",
})

_STATUS_CODING_2_ALIAS: Dict[str, str] = _base_alias_map(STATUS_CODING_2_COLUMNS)
_STATUS_CODING_2_ALIAS.update({
    "area check point": "AREA CHECK POINT",
    "area_check_point": "AREA CHECK POINT",
    "grouping": "GROUPING",
    "identifikasi": "IDENTIFIKASI",
    "status code": "STATUS CODE",
    "status_code": "STATUS CODE",
    "description": "DESCRIPTION",
    "definisi (bahasa indonesia)": "DEFINISI (Bahasa Indonesia)",
    "definisi bahasa indonesia": "DEFINISI (Bahasa Indonesia)",
    "displayed at orion": "DISPLAYED AT ORION",
    "displayed at website": "DISPLAYED AT WEBSITE",
    "displayed at myjne": "DISPLAYED AT MYJNE",
    "status pod": "STATUS POD",
})

_CODING_AUTOCLOSE_ALIAS: Dict[str, str] = _base_alias_map(CODING_AUTOCLOSE_COLUMNS)
_CODING_AUTOCLOSE_ALIAS.update({
    "code autoclose": "CODE AUTOCLOSE",
    "code_autoclose": "CODE AUTOCLOSE",
    "sla autoclose": "SLA AUTOCLOSE",
    "sla_autoclose": "SLA AUTOCLOSE",
    "sla reminder": "SLA REMINDER",
    "sla_reminder": "SLA REMINDER",
})

_CODING_FIRSTMILE_ALIAS: Dict[str, str] = _base_alias_map(CODING_FIRSTMILE_COLUMNS)
_CODING_FIRSTMILE_ALIAS.update({
    "no. coding": "Coding",
    "no coding": "Coding",
    "no_coding": "Coding",
    "kota/kabupaten": "Kota / Kabupaten",
    "kota kabupaten": "Kota / Kabupaten",
    "kode_pos": "Kode POS",
    "kodepos": "Kode POS",
    "status_cabang": "Status Cabang",
    "zona": "ZONA",
    "cabang": "CABANG",
    "wilayah grouping": "WILAYAH GROUPING",
    "wilayah_grouping": "WILAYAH GROUPING",
    "wilayah gouping": "WILAYAH GROUPING",
    "wilayah_gouping": "WILAYAH GROUPING",
    "gate inbound": "Gate Inbound",
    "gate_inbound": "Gate Inbound",
    "gate outbound": "Gate Outbound",
    "gate_outbound": "Gate Outbound",
})

_USERNAME_MANIFEST_ALIAS: Dict[str, str] = _base_alias_map(USERNAME_MANIFEST_COLUMNS)
_USERNAME_MANIFEST_ALIAS.update({
    "manifest user id": "MANIFEST USER ID",
    "manifest_user_id": "MANIFEST USER ID",
    "user id": "MANIFEST USER ID",
    "userid": "MANIFEST USER ID",
    "username": "MANIFEST USER ID",
    "manifest gate": "MANIFEST GATE",
    "manifest_gate": "MANIFEST GATE",
    "gate": "MANIFEST GATE",
})

KIND_ALIASES: Dict[str, Dict[str, str]] = {
    KIND_CODING_NASIONAL: _CODING_NASIONAL_ALIAS,
    KIND_CODING_NTT: _CODING_ALIAS,
    KIND_CAKUPAN_DELIVERY_KOE: _CAKUPAN_ALIAS,
    KIND_SLA_LAZADA: _SLA_LAZADA_ALIAS,
    KIND_ORIGIN_GROUPING_LAZADA: _ORIGIN_GROUPING_LAZADA_ALIAS,
    KIND_SLA_SHOPEE: _SLA_SHOPEE_ALIAS,
    KIND_SERVICE: _SERVICE_ALIAS,
    KIND_ACCOUNT: _ACCOUNT_ALIAS,
    KIND_ID_KURIR: _ID_KURIR_ALIAS,
    KIND_USERNAME_INBOUND: _USERNAME_INBOUND_ALIAS,
    KIND_STATUS_CODING_1: _STATUS_CODING_1_ALIAS,
    KIND_STATUS_CODING_2: _STATUS_CODING_2_ALIAS,
    KIND_CODING_AUTOCLOSE: _CODING_AUTOCLOSE_ALIAS,
    KIND_CODING_FIRSTMILE: _CODING_FIRSTMILE_ALIAS,
    KIND_USERNAME_MANIFEST: _USERNAME_MANIFEST_ALIAS,
}


# ---------------------------------------------------------------------------
# Runtime registry (DB-backed). Konstanta di atas = sumber seed bawaan.
# ---------------------------------------------------------------------------

from dataclasses import dataclass
import json
import re
import threading


ALLOWED_COLOR_CLASSES = {"blue", "emerald", "orange", "purple", "rose", "cyan"}


@dataclass(frozen=True)
class KindDef:
    kind: str
    label: str
    description: str
    tab_label: str
    color_class: str
    columns: List[str]
    is_builtin: bool
    card_group: Optional[str]
    sort_order: int


_registry_lock = threading.RLock()
_registry: Dict[str, KindDef] = {}
_registry_aliases: Dict[str, Dict[str, str]] = {}


def builtin_seed_payload() -> List[dict]:
    """Metadata seed untuk kind bawaan (dipakai saat startup)."""
    return [
        {
            "kind": KIND_CODING_NASIONAL,
            "label": KIND_LABELS[KIND_CODING_NASIONAL],
            "description": "Referensi coding wilayah seluruh Indonesia (.xlsx / .xls / .csv)",
            "tab_label": "Coding Nasional",
            "color_class": "blue",
            "columns": CODING_NASIONAL_COLUMNS,
            "card_group": None,
            "sort_order": 10,
        },
        {
            "kind": KIND_CODING_NTT,
            "label": KIND_LABELS[KIND_CODING_NTT],
            "description": "Referensi coding wilayah Nusa Tenggara Timur (.xlsx / .xls / .csv)",
            "tab_label": "Coding NTT",
            "color_class": "emerald",
            "columns": CODING_NTT_COLUMNS,
            "card_group": None,
            "sort_order": 20,
        },
        {
            "kind": KIND_CAKUPAN_DELIVERY_KOE,
            "label": KIND_LABELS[KIND_CAKUPAN_DELIVERY_KOE],
            "description": "Referensi cakupan area delivery JNE KOE (.xlsx / .xls / .csv)",
            "tab_label": "Cakupan Delivery KOE",
            "color_class": "orange",
            "columns": CAKUPAN_DELIVERY_KOE_COLUMNS,
            "card_group": None,
            "sort_order": 30,
        },
        {
            "kind": KIND_SLA_SHOPEE,
            "label": KIND_LABELS[KIND_SLA_SHOPEE],
            "description": "Referensi SLA khusus Shopee (.xlsx / .xls / .csv)",
            "tab_label": "SLA SHOPEE",
            "color_class": "rose",
            "columns": SLA_SHOPEE_COLUMNS,
            "card_group": None,
            "sort_order": 40,
        },
        {
            "kind": KIND_SERVICE,
            "label": KIND_LABELS[KIND_SERVICE],
            "description": "Referensi master SERVICE JNE (.xlsx / .xls / .csv)",
            "tab_label": "SERVICE",
            "color_class": "cyan",
            "columns": SERVICE_COLUMNS,
            "card_group": None,
            "sort_order": 50,
        },
        {
            "kind": KIND_ACCOUNT,
            "label": KIND_LABELS[KIND_ACCOUNT],
            "description": "Referensi akun dan pelanggan (.xlsx / .xls / .csv)",
            "tab_label": "Account",
            "color_class": "purple",
            "columns": ACCOUNT_COLUMNS,
            "card_group": None,
            "sort_order": 60,
        },
        {
            "kind": KIND_ID_KURIR,
            "label": KIND_LABELS[KIND_ID_KURIR],
            "description": "Referensi ID kurir, cabang, dan agen (.xlsx / .xls / .csv)",
            "tab_label": "ID KURIR",
            "color_class": "blue",
            "columns": ID_KURIR_COLUMNS,
            "card_group": None,
            "sort_order": 70,
        },
        {
            "kind": KIND_USERNAME_INBOUND,
            "label": KIND_LABELS[KIND_USERNAME_INBOUND],
            "description": "Referensi username gate inbound (.xlsx / .xls / .csv)",
            "tab_label": "USERNAME INBOUND",
            "color_class": "emerald",
            "columns": USERNAME_INBOUND_COLUMNS,
            "card_group": None,
            "sort_order": 80,
        },
        {
            "kind": KIND_STATUS_CODING_1,
            "label": KIND_LABELS[KIND_STATUS_CODING_1],
            "description": "Referensi status coding lengkap (.xlsx / .xls / .csv)",
            "tab_label": "Status Coding 1",
            "color_class": "orange",
            "columns": STATUS_CODING_1_COLUMNS,
            "card_group": None,
            "sort_order": 90,
        },
        {
            "kind": KIND_STATUS_CODING_2,
            "label": KIND_LABELS[KIND_STATUS_CODING_2],
            "description": "Referensi status coding ringkas (.xlsx / .xls / .csv)",
            "tab_label": "Status Coding 2",
            "color_class": "rose",
            "columns": STATUS_CODING_2_COLUMNS,
            "card_group": None,
            "sort_order": 100,
        },
        {
            "kind": KIND_CODING_AUTOCLOSE,
            "label": KIND_LABELS[KIND_CODING_AUTOCLOSE],
            "description": "Referensi code autoclose dan SLA (.xlsx / .xls / .csv)",
            "tab_label": "Coding AUTOCLOSE",
            "color_class": "cyan",
            "columns": CODING_AUTOCLOSE_COLUMNS,
            "card_group": None,
            "sort_order": 110,
        },
        {
            "kind": KIND_SLA_LAZADA,
            "label": KIND_LABELS[KIND_SLA_LAZADA],
            "description": "Referensi SLA Lazada (.xlsx / .xls / .csv)",
            "tab_label": "SLA LAZADA",
            "color_class": "purple",
            "columns": SLA_LAZADA_TABLE_COLUMNS,
            "card_group": "lazada",
            "sort_order": 200,
        },
        {
            "kind": KIND_ORIGIN_GROUPING_LAZADA,
            "label": KIND_LABELS[KIND_ORIGIN_GROUPING_LAZADA],
            "description": "Origin Grouping Lazada (.xlsx / .xls / .csv)",
            "tab_label": "SLA LAZADA",
            "color_class": "purple",
            "columns": SLA_LAZADA_ORIGIN_GROUPING_COLUMNS,
            "card_group": "lazada",
            "sort_order": 201,
        },
        {
            "kind": KIND_CODING_FIRSTMILE,
            "label": KIND_LABELS[KIND_CODING_FIRSTMILE],
            "description": "Referensi coding wilayah firstmile (.xlsx / .xls / .csv)",
            "tab_label": "Coding Firstmile",
            "color_class": "blue",
            "columns": CODING_FIRSTMILE_COLUMNS,
            "card_group": None,
            "sort_order": 120,
        },
        {
            "kind": KIND_USERNAME_MANIFEST,
            "label": KIND_LABELS[KIND_USERNAME_MANIFEST],
            "description": "Referensi username / gate manifest (.xlsx / .xls / .csv)",
            "tab_label": "USERNAME MANIFEST",
            "color_class": "emerald",
            "columns": USERNAME_MANIFEST_COLUMNS,
            "card_group": None,
            "sort_order": 130,
        },
    ]


def dedupe_column_names(columns: List[str]) -> List[str]:
    """Duplikat header → name, name.1, name.2 (pola Excel)."""
    counts: Dict[str, int] = {}
    out: List[str] = []
    for raw in columns:
        name = str(raw or "").strip() or "-"
        n = counts.get(name, 0)
        counts[name] = n + 1
        out.append(name if n == 0 else f"{name}.{n}")
    return out


def slugify_kind(label: str) -> str:
    text = (label or "").strip().lower()
    text = re.sub(r"^database\s+", "", text)
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = text.strip("_")
    return (text[:80] or "custom").lower()


def _aliases_for(kind: str, columns: List[str]) -> Dict[str, str]:
    if kind in KIND_ALIASES:
        return dict(KIND_ALIASES[kind])
    aliases = _base_alias_map(columns)
    for col in columns:
        key = col.strip().lower()
        aliases[key] = col
        aliases[key.replace(" ", "_")] = col
        aliases[re.sub(r"[^a-z0-9]+", "_", key).strip("_")] = col
    return aliases


def invalidate_registry() -> None:
    with _registry_lock:
        _registry.clear()
        _registry_aliases.clear()


def refresh_registry_from_rows(rows: List[dict]) -> None:
    """rows: dict dengan keys kind,label,description,tab_label,color_class,columns,is_builtin,card_group,sort_order"""
    next_reg: Dict[str, KindDef] = {}
    next_alias: Dict[str, Dict[str, str]] = {}
    for row in rows:
        kind = str(row["kind"]).strip().lower()
        columns = list(row.get("columns") or [])
        if isinstance(columns, str):
            columns = json.loads(columns)
        columns = [str(c) for c in columns]
        color = str(row.get("color_class") or "blue")
        if color not in ALLOWED_COLOR_CLASSES:
            color = "blue"
        defn = KindDef(
            kind=kind,
            label=str(row.get("label") or kind),
            description=str(row.get("description") or ""),
            tab_label=str(row.get("tab_label") or row.get("label") or kind),
            color_class=color,
            columns=columns,
            is_builtin=bool(row.get("is_builtin")),
            card_group=(str(row["card_group"]) if row.get("card_group") else None),
            sort_order=int(row.get("sort_order") or 0),
        )
        next_reg[kind] = defn
        next_alias[kind] = _aliases_for(kind, columns)
    with _registry_lock:
        _registry.clear()
        _registry.update(next_reg)
        _registry_aliases.clear()
        _registry_aliases.update(next_alias)


def refresh_registry(session) -> None:
    """Load registry dari tabel OpsMasterDataKind."""
    from models import OpsMasterDataKind
    from sqlmodel import select

    rows = session.exec(
        select(OpsMasterDataKind).order_by(OpsMasterDataKind.sort_order, OpsMasterDataKind.id)
    ).all()
    payload = []
    for rec in rows:
        try:
            columns = json.loads(rec.columns_json or "[]")
        except json.JSONDecodeError:
            columns = []
        payload.append(
            {
                "kind": rec.kind,
                "label": rec.label,
                "description": rec.description,
                "tab_label": rec.tab_label,
                "color_class": rec.color_class,
                "columns": columns,
                "is_builtin": rec.is_builtin,
                "card_group": rec.card_group,
                "sort_order": rec.sort_order,
            }
        )
    if not payload:
        # Fallback ke konstanta bawaan jika DB kosong
        payload = [
            {**item, "is_builtin": True} for item in builtin_seed_payload()
        ]
    refresh_registry_from_rows(payload)


def seed_builtin_kinds(session) -> int:
    """Insert kind bawaan yang belum ada. Return jumlah yang ditambahkan."""
    from models import OpsMasterDataKind
    from sqlmodel import select

    existing_raw = session.exec(select(OpsMasterDataKind.kind)).all()
    existing = {
        (x.kind if hasattr(x, "kind") else str(x)) for x in existing_raw
    }

    added = 0
    for item in builtin_seed_payload():
        if item["kind"] in existing:
            continue
        session.add(
            OpsMasterDataKind(
                kind=item["kind"],
                label=item["label"],
                description=item["description"],
                tab_label=item["tab_label"],
                color_class=item["color_class"],
                columns_json=json.dumps(item["columns"], ensure_ascii=False),
                is_builtin=True,
                card_group=item.get("card_group"),
                sort_order=int(item.get("sort_order") or 0),
            )
        )
        added += 1
    if added:
        session.commit()
    refresh_registry(session)
    return added


def list_kind_defs() -> List[KindDef]:
    with _registry_lock:
        items = list(_registry.values())
    items.sort(key=lambda d: (d.sort_order, d.kind))
    return items


def get_kind_def(kind: str) -> KindDef:
    return list_kind_defs_map()[normalize_kind(kind)]


def list_kind_defs_map() -> Dict[str, KindDef]:
    with _registry_lock:
        if not _registry:
            # Soft-fallback ke konstanta jika registry belum di-seed
            refresh_registry_from_rows(
                [{**item, "is_builtin": True} for item in builtin_seed_payload()]
            )
        return dict(_registry)


def label_for_kind(kind: str) -> str:
    return get_kind_def(kind).label


def kind_to_api_dict(defn: KindDef) -> dict:
    return {
        "kind": defn.kind,
        "label": defn.label,
        "description": defn.description,
        "tab_label": defn.tab_label,
        "color_class": defn.color_class,
        "columns": list(defn.columns),
        "is_builtin": defn.is_builtin,
        "card_group": defn.card_group,
        "sort_order": defn.sort_order,
    }


def normalize_kind(kind: str) -> str:
    normalized = (kind or "").strip().lower()
    known = list_kind_defs_map()
    if normalized not in known:
        raise ValueError(
            f"kind '{normalized}' tidak dikenali. "
            "Pastikan jenis database sudah ditambahkan di Master Data."
        )
    return normalized


def normalize_master_columns(df: pd.DataFrame, kind: str) -> pd.DataFrame:
    kind = normalize_kind(kind)
    columns = columns_for_kind(kind)
    with _registry_lock:
        aliases = dict(_registry_aliases.get(kind) or _aliases_for(kind, columns))

    rename_map: Dict[str, str] = {}
    for raw_col in df.columns:
        key = str(raw_col).strip().lower()
        canonical = aliases.get(key)
        if canonical and raw_col != canonical:
            rename_map[raw_col] = canonical
    if rename_map:
        df = df.rename(columns=rename_map)

    # Jika ada duplikat setelah rename, ambil kolom pertama.
    df = df.loc[:, ~pd.Index(df.columns).duplicated()].copy()

    for col in columns:
        if col not in df.columns:
            df[col] = ""
    return df[columns].fillna("")


def columns_for_kind(kind: str) -> List[str]:
    return list(get_kind_def(kind).columns)
