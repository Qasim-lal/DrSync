# WhatsApp Testing Utilities

Local testing tools for WhatsApp integration without Meta approval.

## Files

### `whatsapp-mock-server.ts`
Mock WhatsApp Cloud API server that simulates Meta's endpoints.

**Run:** `npm run whatsapp:mock-server`  
**Port:** 3099

### `whatsapp-simulator-cli.ts`
Interactive CLI for simulating patient conversations.

**Run:** `npm run whatsapp:simulate`

## Quick Start

```bash
# Terminal 1
npm run whatsapp:mock-server

# Terminal 2
npm run dev

# Terminal 3
npm run whatsapp:simulate
```

## Documentation

See: `docs/WHATSAPP_SIMULATOR_GUIDE.md`
