# What'sCooking AI

AI-powered cooking assistant that reads uploaded recipe PDFs, builds a vector index, suggests dishes from available ingredients, and answers cooking questions with recipe-book context.

## Status

Phase 1: project structure initialized.

## Planned Stack

- Backend: Python 3.12, Flask, Flask-CORS
- Retrieval: LlamaIndex, HuggingFace embeddings, PDFReader
- LLM: Groq API using `llama-3.3-70b-versatile`
- Embeddings: `BAAI/bge-small-en-v1.5`
- Frontend: HTML, CSS, JavaScript
- Storage: uploaded PDFs and persisted vector store

## Project Layout

```text
uploads/
index/
  vector_store/
backend/
  app.py
  config.py
  llm.py
  pdf_loader.py
  retriever.py
  utils.py
frontend/
  assets/
  index.html
  script.js
  style.css
prompts/
  chat.txt
  recipe.txt
  suggest.txt
tests/
.env
main.py
requirements.txt
```

## Next Phase

Phase 2 will add the PDF ingestion pipeline.
