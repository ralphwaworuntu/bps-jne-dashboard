import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(correctionrequest);")
cols = cursor.fetchall()
with open('c:\\tmp\\schema.txt', 'w') as f:
    for c in cols:
        f.write(str(c) + '\n')
conn.close()
