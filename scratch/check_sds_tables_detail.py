import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

def dump_table(idx, tbl):
    print(f"=== Table {idx} ===")
    for r in tbl.rows:
        print([c.text.strip().replace('\n', ' ') for c in r.cells])

for idx in [1, 14, 15, 16, 17, 18]:
    dump_table(idx, doc.tables[idx])
