import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

print(f"Total paragraphs: {len(doc.paragraphs)}")
for idx in range(215, 248):
    p = doc.paragraphs[idx]
    has_drawing = any('drawing' in r._r.xml for r in p.runs)
    print(f"P[{idx}] ({p.style.name}) [drawing={has_drawing}]: {p.text[:70]}")
