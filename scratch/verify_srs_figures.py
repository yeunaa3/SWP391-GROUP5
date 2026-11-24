import docx

srs_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SRS_Updated.docx'
doc = docx.Document(srs_path)

for i, p in enumerate(doc.paragraphs):
    if 'Figure 2.' in p.text:
        print(f"P[{i}]: {p.text}")
        # check surrounding paragraphs for drawings
        for j in range(max(0, i-2), min(len(doc.paragraphs), i+3)):
            if 'drawing' in doc.paragraphs[j]._p.xml:
                print(f"   Drawing at P[{j}]")
