export function maskBankAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  return `••••••••${digits.slice(-4)}`
}
