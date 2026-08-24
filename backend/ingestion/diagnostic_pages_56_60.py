"""
Diagnostic script: inspect raw PDF table structure on PDF pages 56–60.
- Does NOT modify row_parser()
- Does NOT perform database insertion
- Does NOT implement the full 55–162 loop
- Purpose: determine table consistency, column counts, headers, and anomalies
"""

import pdfplumber

PDF_PATH = "data/paimana/FlashReport_April2026 .pdf"

# PDF page numbers 56–60 → zero-based indices 55–59
PAGE_RANGE = range(55, 60)  # indices 55,56,57,58,59  →  PDF pages 56,57,58,59,60

with pdfplumber.open(PDF_PATH) as pdf:
    total = len(pdf.pages)
    print(f"Total pages in PDF: {total}\n")
    print("=" * 70)

    for idx in PAGE_RANGE:
        pdf_page_num = idx + 1  # human-readable PDF page number
        page = pdf.pages[idx]

        tables = page.extract_tables()
        num_tables = len(tables)

        print(f"\nPAGE {pdf_page_num}: {num_tables} table(s) detected")
        print("-" * 70)

        if num_tables == 0:
            print("  [No tables found on this page]")
            print("=" * 70)
            continue

        for t_idx, table in enumerate(tables):
            num_rows = len(table)
            num_cols = len(table[0]) if table else 0

            print(f"\n  Table {t_idx}: {num_rows} rows × {num_cols} columns")

            # Show first 2 raw rows
            print(f"  First 2 raw rows:")
            for r_idx, row in enumerate(table[:2]):
                print(f"    Row {r_idx}: {row}")

        print("=" * 70)
