import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

t17 = doc.tables[17]
for r_idx, r in enumerate(t17.rows):
    print(f"Row {r_idx}: {[c.text.strip().replace(chr(10), ' ') for c in r.cells]}")
