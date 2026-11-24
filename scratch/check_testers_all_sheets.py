import openpyxl

def inspect_wb(path):
    print(f"=== {path} ===")
    wb = openpyxl.load_workbook(path, data_only=True)
    for sname in wb.sheetnames:
        ws = wb[sname]
        # find header row
        tester_col = None
        for col in range(1, min(20, ws.max_column + 1)):
            val = ws.cell(row=1, column=col).value
            if val and 'tester' in str(val).lower():
                tester_col = col
                break
        if not tester_col:
            for col in range(1, min(20, ws.max_column + 1)):
                val = ws.cell(row=2, column=col).value
                if val and 'tester' in str(val).lower():
                    tester_col = col
                    break
        
        testers = set()
        if tester_col:
            for r in range(2, ws.max_row + 1):
                v = ws.cell(row=r, column=tester_col).value
                if v and str(v).strip() and str(v).lower() != 'tester':
                    testers.add(str(v).strip())
            print(f"Sheet '{sname}' ({ws.max_row} rows): Testers = {sorted(list(testers))}")
        else:
            print(f"Sheet '{sname}' ({ws.max_row} rows): No tester col found")

inspect_wb(r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_System_Test_Report.xlsx')
inspect_wb(r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_Integration_Test_Report.xlsx')
