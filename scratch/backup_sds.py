import shutil
import os
import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
backup_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS_backup.docx'

if not os.path.exists(backup_path):
    shutil.copyfile(sds_path, backup_path)
    print(f"Created backup: {backup_path}")
else:
    print(f"Backup already exists: {backup_path}")
