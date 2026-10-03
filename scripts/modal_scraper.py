"""
Unified TACC Scraper di Modal Cloud.
Menggabungkan scraping MTEL TACC (UMT, MTEL ALL, MTEL TIS) dan Centratama TACC (FSI dengan OTP Telegram)
ke dalam satu jadwal dan satu eksekusi tunggal.

Target Tab Google Spreadsheet:
1. UMT       -> UMT All Tickets (Aktif, Non-Degraded, Bekasi)
2. MTEL_ALL  -> Ticket Alita All / Fiberisasi (Aktif, Bekasi)
3. MTEL_TIS  -> Ticket Alita TIS (Aktif, Bekasi)
4. FSI       -> Centratama All Tickets (Aktif, Non-Degraded, Bekasi)

Semua data aktif + closed juga dikirim ke API Dashboard Next.js untuk auto-sync database.
Kredensial dibaca aman dari Modal Secret 'mtel-credentials' & 'centratama-credentials'.
"""
import asyncio
import io
import os
import re
import sys
import time
from datetime import datetime, timedelta

import modal

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ==============================================================================
# ⚙️ KONFIGURASI FILTER & TARGET
# ==============================================================================
SA_PATH_IN_CONTAINER = "/root/service-account.json"
TARGET_BRANCH = "BEKASI"
ALLOWED_STATUSES = ["OPEN", "PENDING", "IN PROGRESS", "DELIVERED"]
EXCLUDED_CONDITIONS = ["DEGRADED"]
LOOKBACK_DAYS = 30
WINDOW_DAYS = 30

MTEL_BASE_URL = "https://mtel.tacc.id"
CENTRATAMA_BASE_URL = "https://centratama.tacc.id"

MTEL_TARGETS = [
    {
        "name": "UMT All Tickets",
        "tab": "UMT",
        "category": "UMT",
        "subcategory": "UMT",
        "export_path": "/dashboard/UMT/export-ticket-only-alita/all/all/all",
        "query": "tes=tis",
    },
    {
        "name": "Ticket Alita All (Fiberisasi/MMP)",
        "tab": "MTEL_ALL",
        "category": "MTEL",
        "subcategory": "FIBERISASI",
        "export_path": "/dashboard/export-ticket-only-alita/all/all/all",
        "query": "tes=tis",
    },
    {
        "name": "Ticket Alita TIS",
        "tab": "MTEL_TIS",
        "category": "MTEL",
        "subcategory": "TIS",
        "export_path": "/dashboard/export-ticket-only-alita/all/all/all",
        "query": "label=tis",
    },
]

# ==============================================================================
# 📦 DEFINISI CONTAINER IMAGE MODAL
# ==============================================================================
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "requests>=2.31.0",
        "pandas>=2.0.0",
        "openpyxl>=3.1.0",
        "xlrd>=2.0.1",
        "lxml>=5.0.0",
        "beautifulsoup4>=4.12.0",
        "gspread>=6.0.0",
        "google-auth>=2.0.0",
        "pytz",
        "telethon>=1.30.0",
    )
    .add_local_file("service-account.json", SA_PATH_IN_CONTAINER)
)

app = modal.App("tacc-unified-scraper")


# ==============================================================================
# 🔍 FUNGSI PENDUKUNG (PARSING & CLEANING)
# ==============================================================================
def norm_value(val):
    if val is None:
        return ""
    import pandas as pd
    if pd.isna(val):
        return ""
    return str(val).strip().upper()


def find_column(available_cols, target_names, default=None):
    clean_map = {re.sub(r"[\s_]+", "", c).upper(): c for c in available_cols}
    for t in target_names:
        key = re.sub(r"[\s_]+", "", t).upper()
        if key in clean_map:
            return clean_map[key]
    for c in available_cols:
        for t in target_names:
            if t.upper() in c.upper():
                return c
    return default


def read_export_bytes(content: bytes):
    import pandas as pd

    head = content[:8]
    if head[:2] == b"PK":
        return pd.read_excel(io.BytesIO(content), engine="openpyxl")
    if head[:4] == b"\xd0\xcf\x11\xe0":
        return pd.read_excel(io.BytesIO(content), engine="xlrd")
    text_sample = content[:500].decode("utf-8", errors="ignore").lower()
    if "<table" in text_sample or "<html" in text_sample:
        dfs = pd.read_html(io.BytesIO(content))
        if dfs:
            return dfs[0]
    return pd.read_csv(io.BytesIO(content))


def date_windows(lookback_days: int, window_days: int, today):
    windows = []
    start = today - timedelta(days=lookback_days)
    while start <= today:
        end = min(start + timedelta(days=window_days - 1), today)
        windows.append((start, end))
        start = end + timedelta(days=1)
    return windows


# ==============================================================================
# 📊 GOOGLE SHEETS & DASHBOARD API SYNC
# ==============================================================================
def update_google_sheet(df, tab_name: str, spreadsheet_id: str, sa_path: str):
    import gspread
    from google.oauth2.service_account import Credentials

    print(f"📄 [Google Sheets] Mengirim {len(df)} baris ke tab '{tab_name}'...")
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(sa_path, scopes=scopes)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(spreadsheet_id)

    try:
        ws = sh.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        print(f"   Tab '{tab_name}' belum ada, membuat baru...")
        ws = sh.add_worksheet(title=tab_name, rows=1000, cols=40)

    clean_df = df.fillna("").astype(str)
    headers = list(clean_df.columns)
    data = [headers] + clean_df.values.tolist()

    ws.clear()
    ws.update(range_name="A1", values=data)
    print(f"✅ [Google Sheets] Sukses update tab '{tab_name}'!")


def sync_to_dashboard_api(df, category: str, subcategory: str, api_url: str, secret_key: str):
    import requests

    if not api_url:
        return
    clean_df = df.fillna("").astype(str)
    records = clean_df.to_dict(orient="records")
    print(f"📡 [Dashboard API] Mengirim {len(records)} tiket ({category}/{subcategory}) ke {api_url} ...")
    try:
        res = requests.post(
            api_url,
            json={
                "category": category,
                "subcategory": subcategory,
                "tickets": records,
            },
            headers={
                "x-scraper-secret": secret_key,
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        if res.status_code == 200:
            data = res.json()
            s = data.get("summary", {})
            print(f"✅ [Dashboard API] Sukses! Baru: {s.get('inserted_new', 0)}, Auto-Closed: {s.get('updated_to_closed', 0)}, Update: {s.get('updated_status', 0)}")
        else:
            print(f"⚠️ [Dashboard API] Server merespon HTTP {res.status_code}: {res.text[:200]}")
    except Exception as e:
        print(f"⚠️ [Dashboard API] Gagal kirim ke API: {e}")


# ==============================================================================
# 🔵 MODUL 1: SCRAPING MTEL TACC
# ==============================================================================
def login_mtel(nik: str, password: str):
    import requests

    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })
    r = s.get(f"{MTEL_BASE_URL}/login", timeout=30)
    m = re.search(r'name="csrf-token" content="([^"]+)"', r.text)
    if not m:
        raise Exception("CSRF token tidak ditemukan di halaman login MTEL")

    a = s.post(
        f"{MTEL_BASE_URL}/auth",
        data={"nik": nik, "password": password},
        headers={
            "X-CSRF-TOKEN": m.group(1),
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{MTEL_BASE_URL}/login",
        },
        timeout=30,
    )
    data = a.json()
    if data.get("auth") is not True:
        raise Exception(f"Login MTEL gagal: {data.get('error', 'Kredensial salah')}")
    return s


def scrape_mtel_section(session, windows, now_wib, spreadsheet_id, dashboard_api_url, scraper_secret_key):
    import pandas as pd

    results = []
    for target in MTEL_TARGETS:
        print(f"\n🌐 [MTEL] Memproses: {target['name']}")
        try:
            frames = []
            for (w_start, w_end) in windows:
                start_str = w_start.strftime("%Y-%m-%d")
                end_str = w_end.strftime("%Y-%m-%d")
                sep = "&" if target["query"] else "?"
                url = f"{MTEL_BASE_URL}{target['export_path']}?{target['query']}{sep}get_start={start_str}&get_end={end_str}"
                res = session.get(url, timeout=120)
                if res.status_code == 200 and len(res.content) > 100:
                    part = read_export_bytes(res.content)
                    if part is not None and not part.empty:
                        frames.append(part)

            if not frames:
                print(f"⚠️ [MTEL] Tidak ada data dari target '{target['name']}'")
                continue

            df = pd.concat(frames, ignore_index=True).drop_duplicates()
            total_raw = len(df)

            branch_col = find_column(df.columns, {"BRANCH", "LOKASI"}, None)
            status_col = find_column(df.columns, {"STATUS", "STATUS TIKET", "TICKET STATUS"}, None)
            condition_col = find_column(df.columns, {"CONDITION", "KONDISI"}, None)

            df_bekasi = df.copy()
            if branch_col and branch_col in df_bekasi.columns:
                df_bekasi = df_bekasi[df_bekasi[branch_col].map(norm_value) == TARGET_BRANCH.upper()]

            if condition_col and condition_col in df_bekasi.columns:
                cond_clean = df_bekasi[condition_col].map(norm_value)
                df_bekasi = df_bekasi[~cond_clean.str.contains("DEGRADED", na=False)]

            df_active = df_bekasi.copy()
            if status_col and status_col in df_active.columns:
                df_active = df_active[df_active[status_col].map(norm_value).isin(ALLOWED_STATUSES)]

            print(f"   ✨ Tiket Aktif Bekasi: {len(df_active)} baris | Total Bekasi: {len(df_bekasi)} baris | Raw: {total_raw}")

            # Kirim ke Google Sheets
            df_sheet = df_active.copy()
            df_sheet["SCRAPED_AT_WIB"] = now_wib
            update_google_sheet(df_sheet, target["tab"], spreadsheet_id, SA_PATH_IN_CONTAINER)

            # Kirim ke Dashboard API
            if dashboard_api_url:
                sync_to_dashboard_api(
                    df=df_bekasi,
                    category=target["category"],
                    subcategory=target["subcategory"],
                    api_url=dashboard_api_url,
                    secret_key=scraper_secret_key,
                )

            results.append({
                "target": target["name"],
                "tab": target["tab"],
                "total": total_raw,
                "bekasi_active": len(df_active),
                "status": "SUCCESS",
            })
        except Exception as e:
            print(f"❌ [MTEL] Error pada target '{target['name']}': {e}")
            results.append({"target": target["name"], "tab": target["tab"], "error": str(e), "status": "FAILED"})

    return results


# ==============================================================================
# 🔴 MODUL 2: SCRAPING CENTRATAMA TACC (DENGAN 2FA TELEGRAM OTP)
# ==============================================================================
async def fetch_telegram_otp(api_id: int, api_hash: str, session_str: str, request_time: float, timeout_sec: int = 60) -> str:
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    print("📱 [Telethon] Menghubungkan ke Telegram untuk membaca OTP...")
    client = TelegramClient(StringSession(session_str), api_id, api_hash)
    await client.connect()

    if not await client.is_user_authorized():
        await client.disconnect()
        raise PermissionError("❌ Sesi Telegram tidak terotorisasi.")

    otp_code = None
    start_wait = time.time()
    while time.time() - start_wait < timeout_sec:
        try:
            messages = await client.get_messages("lensa_alert_bot", limit=5)
            for msg in messages:
                if msg.date.timestamp() >= (request_time - 15):
                    text = msg.text or ""
                    m = re.search(r"\b(\d{6})\b", text) or re.search(r"\b(\d{4,8})\b", text)
                    if m:
                        otp_code = m.group(1)
                        print(f"   🔑 [Telegram] OTP Ditemukan: {otp_code}")
                        break
            if otp_code:
                break
        except Exception:
            pass
        await asyncio.sleep(2)

    await client.disconnect()
    if not otp_code:
        raise TimeoutError(f"Gagal mendapatkan OTP dari @lensa_alert_bot dalam {timeout_sec} detik.")
    return otp_code


def login_centratama(nik: str, password: str, api_id: int, api_hash: str, session_str: str):
    import requests

    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })
    r = s.get(f"{CENTRATAMA_BASE_URL}/login", timeout=30)
    m = re.search(r'name="csrf-token" content="([^"]+)"', r.text)
    if not m:
        raise Exception("CSRF token tidak ditemukan di login Centratama")
    csrf_token = m.group(1)

    auth_sent_time = time.time()
    auth_resp = s.post(
        f"{CENTRATAMA_BASE_URL}/auth",
        data={"nik": nik, "password": password},
        headers={
            "X-CSRF-TOKEN": csrf_token,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{CENTRATAMA_BASE_URL}/login",
        },
        timeout=30,
    )
    auth_data = auth_resp.json()
    if auth_data.get("auth") is not True:
        raise Exception(f"Login Centratama tahap 1 gagal: {auth_data.get('error', 'Kredensial salah')}")

    print("📨 [Centratama] NIK & Password diterima, menunggu OTP Telegram...")
    otp = asyncio.run(fetch_telegram_otp(api_id, api_hash, session_str, auth_sent_time))

    otp_resp = s.post(
        f"{CENTRATAMA_BASE_URL}/check-otp",
        data={"nik": nik, "otp": otp},
        headers={
            "X-CSRF-TOKEN": csrf_token,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{CENTRATAMA_BASE_URL}/otp-verification/{nik}",
        },
        timeout=30,
    )
    otp_data = otp_resp.json()
    if otp_data.get("auth") is not True:
        raise Exception(f"Validasi OTP Centratama gagal: {otp_data.get('info', 'OTP salah')}")

    print("🎉 [Centratama] Login & Validasi OTP sukses!")
    return s


def scrape_centratama_section(start_str: str, end_str: str, now_wib: str, spreadsheet_id: str, dashboard_api_url: str, scraper_secret_key: str):
    import os

    api_id = int(os.environ.get("TELEGRAM_API_ID", "0"))
    api_hash = os.environ.get("TELEGRAM_API_HASH", "")
    session_str = os.environ.get("TELEGRAM_SESSION_STRING", "")
    c_nik = os.environ.get("CENTRATAMA_NIK", "")
    c_password = os.environ.get("CENTRATAMA_PASSWORD", "")

    if not c_nik or not c_password or not api_id or not api_hash or not session_str:
        print("⚠️ [Centratama] Kredensial Centratama/Telegram belum lengkap di Modal Secret. Dilewati.")
        return {"target": "Centratama FSI", "tab": "FSI", "status": "SKIPPED"}

    print(f"\n🌐 [Centratama] Memulai Scraping Centratama (FSI)...")
    try:
        session = login_centratama(c_nik, c_password, api_id, api_hash, session_str)
        target_url = f"{CENTRATAMA_BASE_URL}/dashboard/export-ticket-only-alita/all/all/all?tes=tis&get_start={start_str}&get_end={end_str}"
        print(f"⬇️ [Centratama] Mengunduh export dari: {target_url}")
        res = session.get(target_url, timeout=120)

        df = read_export_bytes(res.content)
        total_raw = len(df)

        lokasi_col = find_column(df.columns, {"LOKASI", "BRANCH", "AREA"}, "LOKASI")
        status_col = find_column(df.columns, {"STATUS", "STATUS TIKET"}, "STATUS")
        condition_col = find_column(df.columns, {"CONDITION", "KONDISI"}, "CONDITION")

        df_bekasi = df.copy()
        if lokasi_col and lokasi_col in df_bekasi.columns:
            df_bekasi = df_bekasi[df_bekasi[lokasi_col].map(norm_value).str.contains(TARGET_BRANCH.upper(), na=False)]

        if condition_col and condition_col in df_bekasi.columns:
            df_bekasi = df_bekasi[~df_bekasi[condition_col].map(norm_value).str.contains("DEGRADED", na=False)]

        df_active = df_bekasi.copy()
        if status_col and status_col in df_active.columns:
            df_active = df_active[df_active[status_col].map(norm_value).isin(ALLOWED_STATUSES)]

        print(f"   ✨ Tiket Aktif Bekasi (FSI): {len(df_active)} baris | Total Bekasi: {len(df_bekasi)} baris | Raw: {total_raw}")

        # Kirim ke Google Sheets tab 'FSI'
        df_sheet = df_active.copy()
        df_sheet["SCRAPED_AT_WIB"] = now_wib
        update_google_sheet(df_sheet, "FSI", spreadsheet_id, SA_PATH_IN_CONTAINER)

        # Kirim ke Dashboard API
        if dashboard_api_url:
            sync_to_dashboard_api(
                df=df_bekasi,
                category="CENTRATAMA",
                subcategory="FSI",
                api_url=dashboard_api_url,
                secret_key=scraper_secret_key,
            )

        return {
            "target": "Centratama FSI",
            "tab": "FSI",
            "total": total_raw,
            "bekasi_active": len(df_active),
            "status": "SUCCESS",
        }
    except Exception as e:
        print(f"❌ [Centratama] Error: {e}")
        return {"target": "Centratama FSI", "tab": "FSI", "error": str(e), "status": "FAILED"}


# ==============================================================================
# 🤖 ORCHESTRATOR UTAMA: JALANKAN SEMUA SCRAPER
# ==============================================================================
@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("mtel-credentials"),
        modal.Secret.from_name("centratama-credentials"),
    ],
    timeout=1200,
    # Jadwalkan otomatis jika diinginkan (misal setiap 15 menit):
    # schedule=modal.Period(minutes=15),
)
def run_all_scrapers():
    import pytz

    wib = pytz.timezone("Asia/Jakarta")
    now = datetime.now(wib)
    today = now.date()
    now_wib = now.strftime("%Y-%m-%d %H:%M:%S WIB")

    start_date = today - timedelta(days=LOOKBACK_DAYS)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = today.strftime("%Y-%m-%d")

    spreadsheet_id = os.environ.get("SPREADSHEET_ID", "1MvYREhswUaqhcOsdAByXwc8KoB8sS_8y_jKrlX6H_s8")
    scraper_secret_key = os.environ.get("SCRAPER_SECRET_KEY", "rahasia-scraper-tacc-2026")
    dashboard_api_url = os.environ.get("DASHBOARD_API_URL", "https://squatms.b2bbekasi.web.id/api/sync/tacc")

    print("==================================================================")
    print(f"🚀 [START ALL] MEMULAI UNIFIED SCRAPING TACC PADA {now_wib}")
    print(f"📅 Rentang 30 Hari: {start_str} s/d {end_str}")
    print("==================================================================")

    all_summaries = []

    # 1. Jalankan Scraper MTEL TACC (UMT, MTEL_ALL, MTEL_TIS)
    mtel_nik = os.environ.get("MTEL_NIK")
    mtel_pass = os.environ.get("MTEL_PASSWORD")
    if mtel_nik and mtel_pass:
        print("\n🔹 [1/2] MENJALANKAN SCRAPER MTEL TACC...")
        try:
            mtel_session = login_mtel(mtel_nik, mtel_pass)
            windows = date_windows(LOOKBACK_DAYS, WINDOW_DAYS, today)
            mtel_results = scrape_mtel_section(
                session=mtel_session,
                windows=windows,
                now_wib=now_wib,
                spreadsheet_id=spreadsheet_id,
                dashboard_api_url=dashboard_api_url,
                scraper_secret_key=scraper_secret_key,
            )
            all_summaries.extend(mtel_results)
        except Exception as e:
            print(f"❌ Login MTEL Gagal: {e}")
            all_summaries.append({"target": "MTEL All", "status": "FAILED", "error": str(e)})
    else:
        print("⚠️ MTEL_NIK / MTEL_PASSWORD tidak ditemukan. Melewati MTEL.")

    # 2. Jalankan Scraper Centratama TACC (FSI)
    print("\n🔹 [2/2] MENJALANKAN SCRAPER CENTRATAMA TACC (OTP TELEGRAM)...")
    cent_result = scrape_centratama_section(
        start_str=start_str,
        end_str=end_str,
        now_wib=now_wib,
        spreadsheet_id=spreadsheet_id,
        dashboard_api_url=dashboard_api_url,
        scraper_secret_key=scraper_secret_key,
    )
    all_summaries.append(cent_result)

    print("\n==================================================================")
    print("🏁 [RINGKASAN LENGKAP SCRAPING TACC]")
    print("==================================================================")
    for res in all_summaries:
        status_icon = "✅" if res.get("status") == "SUCCESS" else "⚠️"
        print(f"{status_icon} Tab '{res.get('tab', '-')}' | Target: {res.get('target')} | Status: {res.get('status')} | Aktif: {res.get('bekasi_active', 0)}")
    print("==================================================================")
    return all_summaries


# ==============================================================================
# 🏃 LOCAL ENTRYPOINT
# ==============================================================================
@app.local_entrypoint()
def main():
    print("🚀 Mengirim job UNIFIED TACC Scraping ke Modal Cloud...")
    summary = run_all_scrapers.remote()
    print("🏁 Selesai dieksekusi di Modal Cloud!")
    print(summary)
