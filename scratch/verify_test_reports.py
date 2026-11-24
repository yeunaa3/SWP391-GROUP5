import openpyxl

sys_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_System_Test_Report.xlsx'
wb = openpyxl.load_workbook(sys_path, data_only=True)
print("=== SYSTEM TEST REPORT ===")
print("Sheets:", wb.sheetnames)
ws_tc = wb['System Test Cases']
testers = set()
for r in range(2, ws_tc.max_row + 1):
    val = ws_tc.cell(row=r, column=10).value # Tester column
    if val:
        testers.add(str(val).strip())
print(f"System Test Cases count: {ws_tc.max_row - 1}")
print("System Test Testers:", sorted(list(testers)))

int_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_Integration_Test_Report.xlsx'
wb_int = openpyxl.load_workbook(int_path, data_only=True)
print("\n=== INTEGRATION TEST REPORT ===")
print("Sheets:", wb_int.sheetnames)
ws_itc = wb_int['Integration Test Cases']
it_testers = set()
for r in range(2, ws_itc.max_row + 1):
    val = ws_itc.cell(row=r, column=10).value # Tester column
    if val:
        it_testers.add(str(val).strip())
print(f"Integration Test Cases count: {ws_itc.max_row - 1}")
print("Integration Test Testers:", sorted(list(it_testers)))
