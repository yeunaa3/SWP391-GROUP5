import docx
import os

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

# Let's see the text in paragraphs 215 to 247
for i in range(215, 248):
    print(f"P[{i}] ({doc.paragraphs[i].style.name}): {doc.paragraphs[i].text}")
