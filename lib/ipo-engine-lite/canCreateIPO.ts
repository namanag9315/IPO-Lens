export function canCreateIPO(provider: string, context: 'manual' | 'auto_list' | 'auto_detail' | 'auto_gmp' | 'auto_subscription'): boolean {
  if (context === 'manual') return true

  if (context === 'auto_list') {
    // Only official sources or explicitly approved aggregators after duplicate checks
    const approvedListSources = ['BSE_SME', 'NSE_SME', 'BSE_MAIN', 'NSE_MAIN', 'SEBI_DRHP']
    return approvedListSources.includes(provider)
  }

  // Absolutely NO detail, GMP, or Subscription providers can create master IPOs
  if (context === 'auto_detail' || context === 'auto_gmp' || context === 'auto_subscription') {
    return false
  }

  return false
}
