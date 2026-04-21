const DEFAULT_PLAYER_ACCOUNT = {
  credits: 1000,
  debt: 0,
  creditLimit: 3000,
  stipendAmount: 250,
  stipendEveryShifts: 3,
  completedShifts: 0,
  lastSettlement: 0,
  lastStipendApplied: false,
}

export function createPlayerAccount(overrides = {}) {
  return {
    ...DEFAULT_PLAYER_ACCOUNT,
    ...overrides,
  }
}

export function getAccountBalance(account) {
  if (!account) return 0
  return account.credits - account.debt
}

export function isAccountDelinquent(account) {
  if (!account) return false
  return account.debt > 0
}

export function getAccountStatus(account) {
  if (!account) return 'UNKNOWN'

  if (account.debt >= account.creditLimit) {
    return 'MAXED'
  }

  if (account.debt > 0) {
    return 'DELINQUENT'
  }

  if (account.credits <= 250) {
    return 'LOW_FUNDS'
  }

  return 'STABLE'
}

export function applyShiftSettlement(account, settlementAmount) {
  if (!account) return null

  const amount = Number.isFinite(settlementAmount) ? settlementAmount : 0
  account.completedShifts += 1
  account.lastSettlement = amount
  account.lastStipendApplied = false

  if (amount >= 0) {
    if (account.debt > 0) {
      const debtPayment = Math.min(account.debt, amount)
      account.debt -= debtPayment
      account.credits += amount - debtPayment
    } else {
      account.credits += amount
    }
  } else {
    const loss = Math.abs(amount)

    if (account.credits >= loss) {
      account.credits -= loss
    } else {
      const remainingLoss = loss - account.credits
      account.credits = 0
      account.debt += remainingLoss
    }
  }

  return {
    settlementAmount: amount,
    credits: account.credits,
    debt: account.debt,
    balance: getAccountBalance(account),
    status: getAccountStatus(account),
  }
}

export function tryApplyGovernmentStipend(account) {
  if (!account) return false

  const eligible =
    account.completedShifts > 0 &&
    account.completedShifts % account.stipendEveryShifts === 0 &&
    !account.lastStipendApplied

  if (!eligible) {
    return false
  }

  account.credits += account.stipendAmount
  account.lastStipendApplied = true
  return true
}

export function canAfford(account, amount) {
  if (!account) return false
  const cost = Math.max(0, Number(amount) || 0)
  return getAccountBalance(account) >= cost
}

export function spendCredits(account, amount) {
  if (!account) return false

  const cost = Math.max(0, Number(amount) || 0)
  if (cost === 0) return true

  if (account.credits >= cost) {
    account.credits -= cost
    return true
  }

  const remainder = cost - account.credits
  account.credits = 0
  account.debt += remainder
  return true
}