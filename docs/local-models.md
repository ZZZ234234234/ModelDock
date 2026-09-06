# Ollama and LM Studio

## Ollama

1. Install and start Ollama on the computer running your browser.
2. Download a model appropriate for your hardware, for example `ollama pull qwen3:8b`.
3. In ModelDock, choose Providers → Ollama. The default URL is
   `http://localhost:11434/v1` and transport is **direct**.
4. Test the connection, import models, then switch from Demo to Live mode.

The default discovery endpoint is `/v1/models`. You can also enter an installed
model's exact name manually. Model names are examples, not installation promises.

If CORS blocks access, configure `OLLAMA_ORIGINS` for the **exact origin** of
ModelDock, then restart Ollama. With ModelDock running at localhost:5173:

```bash
# macOS / Linux shell before starting the server
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

```powershell
# Windows PowerShell, after exiting any existing Ollama process
$env:OLLAMA_ORIGINS = "http://localhost:5173"
ollama serve
```

For a hosted page, browser private-network and mixed-content restrictions may
still block access. Running ModelDock locally is the more reliable route.
Do not change Ollama to listen on the public internet to work around CORS.

## LM Studio

Start a model in LM Studio's local server and enable CORS for your local
ModelDock origin. Use `http://localhost:1234/v1`. If local API authentication
is enabled, enter its key in Providers. Fetch the model list to get exact IDs.

“Detect local models” checks these two default loopback endpoints from the
browser. A negative result can mean CORS or browser network policy, not that
the model is absent. The hosted relay deliberately cannot access localhost.

Local model prices default to zero API cost. Electricity and hardware costs
are not estimated.

References: [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility),
[Ollama FAQ](https://docs.ollama.com/faq), [LM Studio docs](https://lmstudio.ai/docs).
