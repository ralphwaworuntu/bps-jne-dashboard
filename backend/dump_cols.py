import pandas as pd
import json

df = pd.read_csv('uploads/geotagging/geotagging_data.csv', sep=None, engine='python', encoding='latin1', on_bad_lines='skip', nrows=1)
with open('geotag_cols.txt', 'w', encoding='utf-8') as f:
    f.write(json.dumps(df.columns.tolist(), indent=2))
print("Saved columns to geotag_cols.txt")
