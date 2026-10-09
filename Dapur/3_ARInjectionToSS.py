import configparser
import pandas as pd
import gspread

def sinkronkan_data_sheets():
    try:
        print("--> Membaca file konfigurasi config.conf...")
        config = configparser.ConfigParser()
        config.read('config.conf')

        url_ss = config['URL']['url_ss'].strip()
        nama_sheet = config['URL']['url_ss_sheet'].strip()

        print("--> Melakukan otentikasi dengan credentials.json...")
        gc = gspread.service_account(filename='credentials.json')

        print("--> Membuka Google Spreadsheet...")
        spreadsheet = gc.open_by_url(url_ss)
        worksheet = spreadsheet.worksheet(nama_sheet)

        print("--> Menghapus data lama dari baris 2 (Kolom A2:K)...")
        worksheet.batch_clear(['A2:K'])

        print("--> Membaca data dari ARClean_temp.xlsx...")
        df = pd.read_excel('ARClean_temp.xlsx')

        df_subset = df.iloc[:, :11]
        df_subset = df_subset.fillna('')
        data_baru = df_subset.values.tolist()

        if data_baru:
            jumlah_baris = len(data_baru)
            print(f"--> Menuliskan {jumlah_baris} baris data baru mulai sel A2...")
            worksheet.update(range_name='A2', values=data_baru, value_input_option='USER_ENTERED')
            print("--> Selesai! Data berhasil diperbarui di Google Sheets.")
        else:
            print("--> File Excel tidak memiliki data untuk ditulis.")

    except Exception as e:
        print(f"--> Terjadi kesalahan: {e}")

if __name__ == '__main__':
    sinkronkan_data_sheets()