import { issueFromProvider } from "~~/server/services/providers/provider-core"
import type { ProviderIssueRequest } from "~~/server/services/types"

export async function issueFromProviderA(
  request: ProviderIssueRequest,
  tx?: any,
) {
  return issueFromProvider("providerA", "PROVIDER_A", request, tx)
}
