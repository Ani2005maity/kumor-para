/**
 * Convert paise (integer) to rupees (number with up to 2 decimal places).
 * e.g., 45000 paise -> 450.00 rupees
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Convert rupees to paise (integer).
 * e.g., 450.50 rupees -> 45050 paise
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Formats a paise amount into a readable Indian Rupee currency string.
 * e.g., 125000 paise -> "₹1,250.00"
 */
export function formatCurrency(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Helper to convert an amount in paise to Indian English words.
 * Useful for tax invoices (e.g., "One Thousand Two Hundred Fifty Rupees Only").
 */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paiseToRupees(paise));
  const remainingPaise = Math.round(paise % 100);

  if (rupees === 0 && remainingPaise === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n] + ' ';
    return tens[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? units[n % 10] + ' ' : '');
  }

  function convertThreeDigits(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    str += convertTwoDigits(n);
    return str;
  }

  let crore = Math.floor(rupees / 10000000);
  let lakh = Math.floor((rupees % 10000000) / 100000);
  let thousand = Math.floor((rupees % 100000) / 1000);
  let hundred = Math.floor(rupees % 1000);

  let result = '';
  if (crore > 0) result += convertTwoDigits(crore) + 'Crore ';
  if (lakh > 0) result += convertTwoDigits(lakh) + 'Lakh ';
  if (thousand > 0) result += convertTwoDigits(thousand) + 'Thousand ';
  if (hundred > 0) result += convertThreeDigits(hundred);

  result = result.trim() + ' Rupees';
  if (remainingPaise > 0) {
    result += ' and ' + convertTwoDigits(remainingPaise).trim() + ' Paise';
  }
  return result + ' Only';
}
