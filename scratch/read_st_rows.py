import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_System_Test_Report.xlsx', data_only=True)

for sheet in ['Test Case List', 'Test Statistics', 'BF01_Premium', 'BF02_Paywall_Content', 'BF03_BF04_Partnership', 'BF05_Contract_Booking', 'BF06_BF07_Campaign', 'BF08_BF09_Ad_Delivery']:
    ws = wb[sheet]
    print(f"\n=== Sheet: {sheet} ===")
    for r in range(6, min(12, ws.max_row + 1)):
        vals = [ws.cell(row=r, column=c).value for c in range(1, 15)]
        non_empty = [(c, v) for c, v in enumerate(vals, 1) if v is not None]
        print(f"R{r}:", non_empty)
