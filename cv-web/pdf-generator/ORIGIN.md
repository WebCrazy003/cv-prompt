# Imported generator

This directory vendors the PDF generation engine and Word template from:

```text
/Users/minimac/Documents/Work/cv-generator
upstream commit: 644c416
```

Imported files:

- `app.py` — DOCX style-carrier and PDF conversion engine.
- `cv_template.docx` — fixed styled Word template.
- `requirements.txt` — Python dependency declaration.
- `UPSTREAM_README.md` — original project documentation.

`cli.py` is the integration boundary added by this repository. The original HTTP
frontend is intentionally not included because Fastify and React already provide the
application and settings UI.
