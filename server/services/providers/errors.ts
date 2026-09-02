export class ProviderTimeoutError extends Error {
  constructor(message = "Provider timeout") {
    super(message)
    this.name = "ProviderTimeoutError"
  }
}

export class ProviderFailureError extends Error {
  constructor(message = "Provider internal error") {
    super(message)
    this.name = "ProviderFailureError"
  }
}

export class ProviderOutOfStockError extends Error {
  constructor(message = "Provider out of stock") {
    super(message)
    this.name = "ProviderOutOfStockError"
  }
}
