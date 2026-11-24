import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_System_Test_Report.xlsx', data_only=True)
ws = wb['Cover and Setup']
print("=== Cover and Setup ===")
for r in range(1, 20):
    vals = [ws.cell(row=r, column=c).value for c in range(1, 10)]
    if any(vals):
        print(f"R{r}:", [v for v in vals if v is not None])

ws2 = wb['BF01_Premium']
print("\n=== BF01_Premium ===")
for r in range(1, 6):
    vals = [ws2.cell(row=r, column=c).value for c in range(1, 15)]
    print(f"R{r}:", [v for v in vals if v is not None])
