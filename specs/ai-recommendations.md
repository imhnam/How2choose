# AI gift recommendations

## Scope

The signed-in user selects one of their recipient profiles, a gift occasion, a maximum budget, and an optional free-text request. The API asks Gemini to create up to three alternative gift bundles and explain the choices. Conversations are saved per account and recipient and are resumed when that recipient is selected again. This version does not modify recipient profiles.

## Data flow

1. `POST /api/recommendations` validates the recipient ID, optional owned conversation ID, occasion, budget (50,000–20,000,000 VND), and optional request (up to 500 characters).
2. The API loads the recipient using both its ID and the authenticated owner ID. It does not send the recipient's display name, phone, address, or avatar to Gemini. Relationship, optional birthday, interests, dislikes, and up to 500 characters of notes are sent as personalization context.
3. The API queries active catalog products and variants with stock, applies effective catalog prices, and includes only variants at or below the requested total budget. A maximum of 100 products and eight affordable variants per product are considered; descriptions, tags, notes, and user requests are bounded before sending.
4. Gemini receives recent conversation turns and eligible candidates, and returns structured JSON containing a short message, up to three alternative bundles, and an optional follow-up question. Each bundle may contain one or more products; the sum of item price × quantity in each bundle must fit the budget. Alternative bundles are not added together.
5. The API rejects malformed output, verifies every product/variant pair, quantity, stock, and complete bundle total against the live catalog, and discards invalid bundles.
6. Successful user and assistant messages plus compact, validated bundle snapshots are saved in PostgreSQL. `GET /api/recommendations/conversation?recipientId=...` loads the owner-scoped recipient and latest conversation together, returning the 20 newest messages when a conversation exists or an empty history without a follow-up query. Older messages are fetched in pages when requested. Messages are rendered on the correct side of the chat.
7. The web app supports adding a complete suggested bundle to the local cart and allows the user to continue the conversation or change criteria.

## Safety and failures

- `GEMINI_API_KEY` is server-only. Never expose it in browser code, public environment variables, logs, or API responses.
- `GEMINI_MODEL` is read by the API. Underscores are normalized to hyphens to accept the common model-ID spelling in local environment configuration.
- Profile and catalog text are untrusted data, not instructions. The prompt explicitly treats them as such; API authorization and catalog validation remain authoritative.
- Never trust model-generated IDs, prices, stock, links, or purchase instructions. Unknown product/variant IDs are discarded.
- Missing credentials, provider errors, timeouts, malformed JSON, and invalid response shapes return explicit API errors. No model-like fallback is presented as a successful recommendation.
- If no in-stock variant fits the budget, return an explicit empty bundle list without calling Gemini and persist the user/assistant messages.
- Provider quota and deployment-level rate limiting should be configured before exposing the endpoint broadly.

## Acceptance checks

- Unauthenticated calls are rejected by the session guard.
- A user cannot request recommendations for another user's recipient profile.
- Request DTO rejects unsupported occasions, extra properties, and out-of-range budgets.
- Candidate variants are in stock and within the budget using server-computed effective prices.
- Every returned bundle's sum of authoritative item prices × quantities is within budget; a bundle may have one or multiple items.
- Gemini output is schema-checked and every product, variant, quantity, stock value, and bundle total is revalidated against the live catalog.
- Chat history persists across reloads and correctly displays user and assistant roles.
- Initial history loading is bounded to 20 messages; older history remains available through paging.
- Provider/configuration errors and empty-catalog outcomes are distinct and visible to the user.
- Unit/API tests use a mocked Gemini response; live Gemini checks are separate and require configured credentials and quota.
