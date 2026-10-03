"""
Script interaktif untuk inisialisasi sesi Telegram (Telethon) & Centratama.
Kredensial akan langsung disimpan ke Modal Secret 'centratama-credentials'.
Tidak ada password atau string sesi yang disimpan di dalam file kode.
"""
import getpass
import os
import subprocess
import sys

from telethon.sessions import StringSession
from telethon.sync import TelegramClient

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def main():
    print("=" * 60)
    print("🔐 SETUP KREDENSIAL TELEGRAM & CENTRATAMA UNTUK SCRAPER MODAL")
    print("=" * 60)
    print("Data yang Anda masukkan akan langsung disimpan ke Modal Secrets terenkripsi.")
    print("Tidak akan ada file plaintext yang tersimpan di laptop Anda.\n")

    # 1. Input Telegram API
    api_id_str = input("👉 Masukkan Telegram API ID (angka): ").strip()
    try:
        api_id = int(api_id_str)
    except ValueError:
        print("❌ Error: API ID harus berupa angka!")
        return

    api_hash = input("👉 Masukkan Telegram API HASH: ").strip()
    if not api_hash:
        print("❌ Error: API HASH tidak boleh kosong!")
        return

    print("\n📱 Sekarang kita akan menghubungkan akun Telegram Anda...")
    print("Telegram akan mengirimkan kode verifikasi login ke aplikasi Telegram Anda.")
    phone = input("👉 Masukkan nomor HP Telegram Anda (format internasional, contoh +6281234567890): ").strip()

    client = TelegramClient(StringSession(), api_id, api_hash)
    try:
        client.start(phone=phone)
        session_str = client.session.save()
        print("✅ Berhasil login ke Telegram! String session berhasil dibuat.")
    except Exception as e:
        print(f"❌ Gagal otorisasi Telegram: {e}")
        return
    finally:
        client.disconnect()

    # 2. Input Kredensial Centratama
    print("\n" + "=" * 60)
    print("🏢 KREDENSIAL CENTRATAMA TACC (https://centratama.tacc.id)")
    print("=" * 60)
    nik = input("👉 Masukkan NIK Akun Centratama: ").strip()
    password = getpass.getpass("👉 Masukkan Password Akun Centratama (teks tidak tampak saat diketik): ").strip()

    if not nik or not password:
        print("❌ Error: NIK dan Password Centratama tidak boleh kosong!")
        return

    spreadsheet_id = os.environ.get("SPREADSHEET_ID", "1MvYREhswUaqhcOsdAByXwc8KoB8sS_8y_jKrlX6H_s8")
    scraper_secret_key = os.environ.get("SCRAPER_SECRET_KEY", "rahasia-scraper-tacc-2026")

    # 3. Simpan ke Modal Secret
    print("\n📦 Menyimpan ke Modal Secrets ('centratama-credentials')...")
    cmd = [
        "modal",
        "secret",
        "create",
        "centratama-credentials",
        "--force",
        f"TELEGRAM_API_ID={api_id}",
        f"TELEGRAM_API_HASH={api_hash}",
        f"TELEGRAM_SESSION_STRING={session_str}",
        f"CENTRATAMA_NIK={nik}",
        f"CENTRATAMA_PASSWORD={password}",
        f"SPREADSHEET_ID={spreadsheet_id}",
        f"SCRAPER_SECRET_KEY={scraper_secret_key}",
    ]

    try:
        subprocess.run(cmd, check=True)
        print("\n🎉 SUKSES! Secret 'centratama-credentials' berhasil dibuat di Modal Cloud!")
        print("Semua data Anda sekarang tersimpan aman & terenkripsi di Modal.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Gagal membuat Modal Secret: {e}")


if __name__ == "__main__":
    main()
