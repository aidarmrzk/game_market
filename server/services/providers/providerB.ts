import { issueFromProvider } from "~~/server/services/providers/provider-core"
import type { ProviderIssueRequest } from "~~/server/services/types"

export async function issueFromProviderB(
  request: ProviderIssueRequest,
  tx?: any,
) {
  return issueFromProvider("providerB", "PROVIDER_B", request, tx)
}
