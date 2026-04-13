Update Fitur dan Fix Bug : 

FOKUS PADA DATA FIRSTMILE!!!

1. untuk data firstmile, bagian menu Database OTS, cara kerjanya adalah cek kolom "STATUS_POD" jika ada data yang status podnya "Success" dan "Return Shipper" maka hapus seluruh baris yang berkaitan dengan kedua status tersebut.
2. cek pada kolom "CODING" jika ada data yang codingnya "CR8" maka hapus seluruh baris yang berkaitan dengan coding tersebut.
3.  tambahkan tombol download database. tombol download tersebut akan mengunduh file csv yang sudah di proses pada point 1 dan point 2.
4. format nama file jadi "database_ots_DD-MM-YYYY.csv".
5. untuk menu database ots cabang, jika di klik akan di arahkan ke halaman khusus database ots cabang.
6. isi dari halaman database ots cabang adalah tabel yang isinya seperti berikut ini : 
    1. AWB (AWB)
    2. Tgl Entry (TGL_ENTRY)
    3. Status LT (LT, Transaksi - Today)
    4. Reminding Days (REMINDING DAYS)
    5. Cabang Origin (Cabang Origin)
    6. Cabang Destinasi (Cabang Destinasi)
    7. Shipment Type (Shipment Type)
    8. Shipment Type 2 (Shipment Type 2)
    9. Validasi Status Proses Firstmile (Validasi Status Proses Firstmile)
    10. Validasi Status Proses Lastmile Destinasi (Validasi Status Proses Lastmile Destinasi).
    11. Validasi Cabang (Validasi Cabang).

Note : yang di dalam kurung adalah nama kolom yang ada di file Database AllShipment Firstmile.
7. pada halaman database ots cabang, tambahkan tombol download database. tombol download tersebut akan mengunduh file csv yang sudah di proses pada point 8 dan point 9 (Nama file tolong di sesuaikan jadi "database_ots_cabang_DD-MM-YYYY.csv").
8. untuk menghasilkan file "database_ots_cabang_DD-MM-YYYY.csv", caranya adalah :
    1. pada kolom "STATUS_POD" jika ada status "Success" dan "Return Shipper" hapus seluruh baris yang berkaitan dengan kedua status tersebut.	
    2. pada kolom "STATUS_POD" jika ada status "Missing" lalu cek pada tabel TGL_RECEIVED, jika TGL_RECEIVED > 3 bulan maka hapus barisnya. jika TGL_RECEIVED <= 3 bulan, jangan di hapus.	
    3. pada kolom "STATUS_POD" jika ada status "Damage Case" lalu cek pada tabel TGL_RECEIVED, jika TGL_RECEIVED > 3 bulan maka hapus barisnya. jika TGL_RECEIVED <= 3 bulan, jangan di hapus.
    4. pada kolom "STATUS_POD" jika ada status "Destroyed" lalu cek pada tabel TGL_RECEIVED, jika TGL_RECEIVED > 3 bulan maka hapus barisnya. jika TGL_RECEIVED <= 3 bulan, jangan di hapus.
    5. pada kolom "CODING", pilih coding "CR8" lalu hapus seluruh baris yang berkaitan dengan coding tersebut.	
    6. pada kolom "CODING", pilih coding "R25,R37" lalu cek pada tabel TGL_RECEIVED, jika TGL_RECEIVED > 3 bulan maka hapus barisnya. jika TGL_RECEIVED <= 3 bulan, jangan di hapus.	
    7. pada kolom "CODING", pilih coding yang ada "UF, RFD, RFI" hapus barisnya.
    8. pada kolom "CODING", pilih coding :	
        CL1","CL2","D26","D37" lalu cek pada kolom TGL_RECEIVED, jika TGL_RECEIVED > 3 bulan maka hapus barisnya. jika TGL_RECEIVED <= 3 bulan, jangan di hapus.
    9. pada kolom "CODING", pilih coding "U37" biarkan barisnya.   