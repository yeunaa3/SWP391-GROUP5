import docx

srs_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SRS_Updated.docx'
doc = docx.Document(srs_path)

print(f"Total Paragraphs: {len(doc.paragraphs)}")
print(f"Total Tables: {len(doc.tables)}")

keywords = ['JWT', 'localStorage', 'V23', 'Flyway', '3NF', 'PayOS', 'Cloudinary', 'BF-09', 'UC-39']
for kw in keywords:
    matches = 0
    for p in doc.paragraphs:
        if kw.lower() in p.text.lower():
            matches += 1
    for t in doc.tables:
        for r in t.rows:
            for c in r.cells:
                if kw.lower() in c.text.lower():
                    matches += 1
    print(f"Keyword '{kw}': {matches} occurrences")
