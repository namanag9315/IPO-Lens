import { FactCandidate, ALLOWED_FACT_KEYS } from './providers/types'

export interface ValidatedFact extends FactCandidate {
  validationStatus: 'valid' | 'warning' | 'rejected'
  validationErrors: string[]
}

const PLACEHOLDERS = ['being verified', 'na', 'n/a', 'pending', 'not available', '-', 'null']

function isPlaceholder(val: any): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim()
    return lower === '' || PLACEHOLDERS.includes(lower)
  }
  return false
}

export function validateFactCandidates(candidates: FactCandidate[]): ValidatedFact[] {
  return candidates.map(c => {
    const errors: string[] = []
    let status: 'valid' | 'warning' | 'rejected' = 'valid'

    // 1. Basic checks
    if (!ALLOWED_FACT_KEYS.includes(c.factKey)) {
      return { ...c, validationStatus: 'rejected', validationErrors: ['Key not in whitelist'] }
    }

    if (isPlaceholder(c.factValue)) {
      return { ...c, validationStatus: 'rejected', validationErrors: ['Value is a placeholder'] }
    }

    if (c.confidence === 'low') {
      status = 'warning'
      errors.push('Low confidence extraction')
    }

    // 2. Specific key checks
    if (c.factKey === 'company_description') {
      const desc = String(c.factValue)
      if (desc.length < 80) {
        status = 'rejected'
        errors.push('Description shorter than 80 characters')
      }
      const lower = desc.toLowerCase()
      if (status !== 'rejected' && !lower.includes('manufacture') && !lower.includes('provide') && !lower.includes('engage') && !lower.includes('business')) {
        status = 'warning'
        errors.push('Does not seem to contain standard business terms')
      }
    }

    if (c.factKey === 'lead_manager_name') {
      const lm = String(c.factValue).toLowerCase()
      const allowedTerms = ['capital', 'advisors', 'merchant', 'securities', 'financial', 'broking', 'corporate']
      if (!allowedTerms.some(t => lm.includes(t))) {
        status = 'warning'
        errors.push('Does not contain typical lead manager suffix. Admin review required.')
      }
    }

    if (c.factKey === 'registrar_name') {
      const reg = String(c.factValue).toLowerCase()
      const allowedTerms = ['rta', 'registrar', 'link intime', 'kfin', 'bigshare', 'mufg', 'cameo', 'skyline', 'maashitla', 'purva']
      if (!allowedTerms.some(t => reg.includes(t))) {
        status = 'warning'
        errors.push('Does not contain known registrar name. Admin review required.')
      }
    }

    if (c.factKey === 'subscription_table') {
      if (!Array.isArray(c.factValue)) {
         status = 'rejected'
         errors.push('Not an array of rows')
      } else {
         const hasCategory = c.factValue.some(r => Object.keys(r).some(k => k.toLowerCase().includes('category')))
         if (!hasCategory && c.factValue.length > 0) {
           status = 'warning'
           errors.push('Table does not clearly have a category column.')
         }
      }
    }

    if (c.factKey === 'financial_table') {
      if (!Array.isArray(c.factValue)) {
         status = 'rejected'
         errors.push('Not an array of rows')
      } else {
         const hasRevOrPat = c.factValue.some(r => Object.keys(r).some(k => k.toLowerCase().includes('revenue') || k.toLowerCase().includes('pat') || k.toLowerCase().includes('income') || k.toLowerCase().includes('assets')))
         if (!hasRevOrPat && c.factValue.length > 0) {
           status = 'warning'
           errors.push('Financial table missing obvious revenue/PAT headers')
         }
      }
    }

    if (c.factKey === 'peer_valuation_table') {
      if (!Array.isArray(c.factValue)) {
         status = 'rejected'
         errors.push('Not an array of rows')
      } else {
         const hasEPSorPE = c.factValue.some(r => Object.keys(r).some(k => k.toLowerCase().includes('p/e') || k.toLowerCase().includes('eps')))
         if (!hasEPSorPE && c.factValue.length > 0) {
           status = 'warning'
           errors.push('Peer table missing P/E or EPS headers')
         }
      }
    }

    if (status === 'valid' && errors.length > 0) {
       status = 'warning'
    }

    return {
      ...c,
      validationStatus: status,
      validationErrors: errors
    }
  })
}
