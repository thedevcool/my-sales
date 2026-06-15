// Sales are written synchronously inside a database transaction
// (see src/lib/sales.ts), so no background worker is required.
export async function register() {}
