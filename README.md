# Investment Collection

A full-stack application simulating a core insurance/pension data collection flow: provider connection, BankID authentication, real-time data collection, and investment display.

## Architecture

```
User → React Frontend → Express Backend → BankID Mock + Provider Adapter
         (Vite)           (Node.js)
```

**Flow:** Enter personnummer → BankID QR authentication → View investment data
