// Money is integer pence everywhere in the app; Django sends prices as decimal strings in pounds.

/** "15.00" → 1500 */
export const poundsToPence = (pounds: string | number) => Math.round(Number.parseFloat(String(pounds)) * 100)

/** 1500 → "£15", 1499 → "£14.99" */
export const formatGBP = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 ? 2 : 0
  }).format(pence / 100)
