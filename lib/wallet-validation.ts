export function validateWalletAddress(type: string, address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return null; // empty is fine (optional)

  switch (type) {
    case 'ETH':
    case 'USDT':
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return `${type} address must start with 0x followed by 40 hex characters`;
      }
      break;
    case 'SOL':
      if (/^0x/.test(trimmed)) {
        return 'SOL address should not start with 0x';
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
        return 'SOL address must be 32-44 base58 characters';
      }
      break;
    case 'BTC':
      if (!/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed)) {
        return 'Invalid BTC address format';
      }
      break;
  }

  return null;
}
