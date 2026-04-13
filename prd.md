# Project: JNE KOE Performance Dashboard & Excel Automation System

# Core Requirement
Build a web-based application where:
1.  **Frontend:** A clean dashboard for users to upload files and view data.
2.  **Backend:** A Python-based server that handles heavy data processing and Excel file manipulation.

# Tech Stack
* **Frontend:** Next.js (React) + Tailwind CSS.
    * *Reason:* Fast, modern, and excellent for creating interactive dashboards.
* **Backend:** Python FastAPI.
    * *Reason:* High performance, easy to integrate with AI/Data tools, and native support for Excel processing libraries.
* **Database:** PostgreSQL (Supabase or Local Postgres).
* **File Storage:** Local server storage (for holding the 'Excel Templates' and temporary uploaded files).

# Detailed Workflow Description for the Agent
1.  **Template Management (Server-Side):**
    * The backend must have a stored folder named `/templates`.
    * This folder contains your pre-formatted Excel files (e.g., `Template_A.xlsx`, `Template_B.xlsx`) which contain your formulas and styling.

2.  **The Upload Process:**
    * User logs in to the website.
    * User uploads the `Master_Data.xlsx`.
    * The Frontend sends this file to the FastAPI Backend.

3.  **The Python Logic (The "Brain"):**
    * **Step A (Ingest):** Use `pandas` to read the uploaded `Master_Data.xlsx` into a dataframe.
    * **Step B (Dashboard Data):** Calculate key metrics (Total Shipments, Success Rate, SLA Breaches) and save these numbers to the PostgreSQL database for the visual charts.
    * **Step C (Excel Generation):**
        * Load the stored `Template_A.xlsx` using `openpyxl`.
        * Filter the Master Data based on logic (e.g., only "Delivered" items).
        * **Inject** this data into `Template_A.xlsx` starting at a specific row (e.g., Row 2), ensuring existing formulas in other columns are preserved.
        * Save the result as a new file (e.g., `Output_Report_Date.xlsx`).

4.  **Download & View:**
    * The Frontend displays a "Download Processed Reports" button.
    * The Frontend updates the charts based on the new data in the database.

# Instructions for the AI
1.  Initialize a repository with two folders: `/frontend` (Next.js) and `/backend` (FastAPI).
2.  Create a `requirements.txt` for the backend including: `fastapi`, `uvicorn`, `pandas`, `openpyxl`, `python-multipart`.
3.  Write a basic API endpoint `/upload-master` that accepts an Excel file.
4.  Write a placeholder function `process_excel_data()` where we will later put the specific column logic.