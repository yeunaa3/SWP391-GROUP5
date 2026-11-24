import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_Integration_Test_Report.xlsx', data_only=True)

sheets = ['IT_Payment_Integration', 'IT_Content_Security', 'IT_Partnership_Review', 'IT_Booking_Contract', 'IT_Campaign_Asset', 'IT_Ad_Delivery_Tracking', 'IT_Security_Integration']
for sheet in sheets:
    ws = wb[sheet]
    print(f"\n=== Sheet: {sheet} ===")
    for r in range(10, min(13, ws.max_row + 1)):
        vals = [ws.cell(row=r, column=c).value for c in range(1, 15)]
        non_empty = [(c, v) for c, v in enumerate(vals, 1) if v is not None]
        print(f"R{r}:", non_empty)
