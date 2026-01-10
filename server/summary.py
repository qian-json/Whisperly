import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def summarize_text(text):
    payload = {
        "model": "gemma3:1b",
        "prompt": f"Summarize this spoken conversation clearly and concisely, this is meant for someone that is hard-of-hearing:\n{text}",
        "stream": False
    }

    response = requests.post(OLLAMA_URL, json=payload)
    return response.json()["response"]