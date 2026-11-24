import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

images_found = []
for i, p in enumerate(doc.paragraphs):
    for r in p.runs:
        if 'drawing' in r._r.xml:
            # find blip
            import xml.etree.ElementTree as ET
            root = ET.fromstring(r._r.xml)
            for elem in root.iter():
                if elem.tag.endswith('blip'):
                    embed = elem.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    images_found.append((i, p.text[:40], embed))

print(f"Total blip runs: {len(images_found)}")
for item in images_found:
    print(item)
