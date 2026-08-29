# Future Billing Architecture

Billing is reserved for a release after PoliSmart Africa AI Version 1. The current product does not
process payments, offer paid subscriptions, collect payment credentials, or display pricing,
transactions, invoices, or payment history.

The disabled **Billing — Soon** navigation item reserves a future authenticated product area. A
future reviewed milestone may add subscription plans, organization billing, plan changes, invoices,
payment history, billing-administrator controls, and an external payment-provider abstraction.

Before that milestone can be enabled, it requires a separately approved design, server-side
authorization, privacy and terms updates, provider selection, webhook security, database review,
test-mode acceptance, and production launch approval. PoliSmart must never store raw card numbers,
bank-account credentials, or payment-provider secrets in client code.
