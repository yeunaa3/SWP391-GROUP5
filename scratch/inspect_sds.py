import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

for i, p in enumerate(doc.paragraphs):
    xml = p._p.xml
    if 'drawing' in xml or 'blip' in xml:
        prev = doc.paragraphs[i-1].text if i > 0 else ''
        curr = p.text
        nxt = doc.paragraphs[i+1].text if i < len(doc.paragraphs)-1 else ''
        print(f"P[{i}]: [IMG] prev='{prev[:60]}' curr='{curr[:60]}' next='{nxt[:60]}'")
