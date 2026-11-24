import openpyxl

def check_weekly(path):
    print(f"=== Checking {path} ===")
    wb = openpyxl.load_workbook(path, data_only=True)
    print("Sheets count:", len(wb.sheetnames))
    print("Sheet names:", wb.sheetnames)
    for name in wb.sheetnames:
        ws = wb[name]
        # check if it has content
        cell_a1 = ws['A1'].value
        cell_c4 = ws['C4'].value if ws.max_row >= 4 else None
        print(f"  {name}: {ws.max_row} rows, A1='{cell_a1}', C4='{cell_c4}'")

check_weekly(r'C:\Users\Dumpling\Desktop\Document\Document\Group5_WeeklyReport.xlsx')
check_weekly(r'C:\Users\Dumpling\Desktop\Guides  Templates-20260909\FA-2026\Group5_WeeklyReport.xlsx')
