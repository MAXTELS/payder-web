/**
 * Thousands-separate the integer part of a fixed-decimal amount string
 * ("1234.56" -> "1,234.56") without ever round-tripping through Number —
 * wallet balances are arbitrary-precision decimal strings from the backend,
 * and Number() risks losing precision on a large-enough figure.
 */
export function formatWithCommas(raw: string): string {
  const [intPart, decPart] = raw.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}
