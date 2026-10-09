import configparser
import os
import shutil
import pandas as pd


def load_config(config_file="config.conf"):
    config = configparser.ConfigParser()
    if not os.path.exists(config_file):
        raise FileNotFoundError(
            f"File konfigurasi '{config_file}' tidak ditemukan!"
        )
    config.read(config_file, encoding="utf-8")
    return config


def auto_detect_header_row(df_raw):
    keywords = [
        "NAMA PELANGGAN",
        "NAMA CUSTOMER",
        "NO. FAKTUR",
        "NO FAKTUR",
        "TGL FAKTUR",
        "SISA PIUTANG",
    ]
    for idx, row in df_raw.iterrows():
        row_str_upper = [str(val).strip().upper() for val in row.dropna()]
        if any(kw in row_str_upper for kw in keywords):
            return idx
    non_empty_counts = df_raw.notna().sum(axis=1)
    max_count = non_empty_counts.max()
    for idx, count in enumerate(non_empty_counts):
        if count >= max_count * 0.7:
            return idx
    return 0


def process_arvi_source(excel_path, sheet_name, output_file="ARClean_temp.xlsx"):
    print(
        f"--> Memproses sheet '{sheet_name}' dari '{excel_path}' ->"
        f" '{output_file}'..."
    )
    df_raw = pd.read_excel(excel_path, sheet_name=sheet_name, header=None)
    header_idx = auto_detect_header_row(df_raw)
    df_clean = df_raw.iloc[header_idx + 1 :].copy()
    df_clean.columns = df_raw.iloc[header_idx].astype(str).str.strip()
    df_clean = df_clean.dropna(how="all", axis=1).reset_index(drop=True)
    df_clean.to_excel(output_file, index=False)
    print(
        f"--> Sheet '{sheet_name}' berhasil diekstrak & dibersihkan ke"
        f" '{output_file}'!"
    )

def run_preparation():
    print("--> Memulai proses salin data dan ekstraksi")

    try:
        config = load_config("config.conf")
    except Exception as e:
        print(f"--> Gagal membaca config.conf: {e}")
        return

    if not config.has_section("DIR"):
        print("--> Section [DIR] tidak ditemukan di dalam config.conf!")
        return

    dir_config = config["DIR"]
    arvi_path = dir_config.get("arvi", "").strip()
    arvi_ar_sheet = dir_config.get("arvi_ar_sheet", "").strip()

    if arvi_path and arvi_ar_sheet:
        if os.path.exists(arvi_path):
            process_arvi_source(
                excel_path=arvi_path,
                sheet_name=arvi_ar_sheet,
                output_file="ARClean_temp.xlsx",
            )
        else:
            print(f"--> File ARVIEWER tidak ditemukan pada path: {arvi_path}")
    else:
        print("--> Parameter 'arvi' atau 'arvi_ar_sheet' tidak diisi.")

    print("--> Proses selesai!")


if __name__ == "__main__":
    run_preparation()