# AI gift recommendations

## Scope

The signed-in user selects one of their recipient profiles, a gift occasion, a maximum budget, and an optional free-text request. The API asks Gemini to create up to three alternative gift bundles and explain the choices. Conversations are saved per account and recipient and are resumed when that recipient is selected again. This version does not modify recipient profiles.

## Data flow

1. `POST /api/recommendations` validates the recipient ID, optional owned conversation ID, occasion, budget (50,000–20,000,000 VND), optional request (up to 500 characters), and optional idempotency key (up to 100 characters). Repeating a key with the same payload returns the stored response without calling Gemini; reusing it with a different payload returns 409.
2. The API loads the recipient using both its ID and the authenticated owner ID. It does not send the recipient's display name, phone, address, or avatar to Gemini. Relationship, optional birthday, interests, dislikes, and up to 500 characters of notes are sent as personalization context.
3. The API queries active catalog products and variants with stock, applies effective catalog prices, and includes only variants at or below the requested total budget. A maximum of 100 products and eight affordable variants per product are considered; descriptions, tags, notes, and user requests are bounded before sending.
4. Gemini receives recent conversation turns and eligible candidates, and returns structured JSON containing a short message, up to three alternative bundles, and an optional follow-up question. Each bundle may contain one or more products; the sum of item price × quantity in each bundle must fit the budget. Alternative bundles are not added together.
5. The API rejects malformed output, verifies every product/variant pair, quantity, stock, and complete bundle total against the live catalog, and discards invalid bundles. A product deactivated between candidate selection and validation drops that bundle instead of failing the request.
6. Successful user and assistant messages plus compact, validated bundle snapshots are saved in PostgreSQL. Snapshots store media IDs instead of expiring URLs; history responses re-sign media URLs. `GET /api/recommendations/conversation?recipientId=...` loads the owner-scoped recipient and latest conversation together, returning the 20 newest messages when a conversation exists or an empty history without a follow-up query. Older messages are fetched in pages when requested. Messages are rendered on the correct side of the chat.
7. The web app supports adding a complete suggested bundle or a single recommended item to the local cart. Before adding, the client revalidates each item against `GET /api/catalog/products/:slug` and uses the current price, variant and stock; items that are sold out, deactivated or missing their variant are skipped with a notice. When the catalog is unreachable the client falls back to the stored snapshot. The budget control uses the same 50,000–20,000,000 VND range as the API and provides a numeric input next to the slider.
8. `POST /api/recommendations` is limited to 5 requests per minute per account; other recommendation routes allow 60 requests per minute. The limit is enforced after session authentication so it applies per user rather than per IP.
9. Candidates are restricted to the recipient's shipping region when the profile has a structured address: province codes map to `HN`, `HCM`, `DN`, otherwise the `v1:<code>`/`v2:<code>` token is matched against `shippingRegions`. Products shipping everywhere are always eligible. Recipients without a structured address see no region restriction.
10. `DELETE /api/recommendations/conversation?recipientId=...` deletes every conversation (and messages) of an owner-scoped recipient and returns the deleted count. The web app offers "Hội thoại mới", which starts a fresh conversation for the next request, and "Xóa lịch sử", which permanently deletes stored conversations after confirmation. While a recommendation request is in flight the client shows a cancel control that aborts its own wait; the request may still complete server-side and appear after reload.

## Safety and failures

- `GEMINI_API_KEY` is server-only. Never expose it in browser code, public environment variables, logs, or API responses.
- `GEMINI_MODEL` is read by the API. Underscores are normalized to hyphens to accept the common model-ID spelling in local environment configuration.
- Profile and catalog text are untrusted data, not instructions. The prompt explicitly treats them as such; API authorization and catalog validation remain authoritative.
- Never trust model-generated IDs, prices, stock, links, or purchase instructions. Unknown product/variant IDs are discarded.
- Missing credentials, provider errors, timeouts, malformed JSON, and invalid response shapes return explicit API errors. No model-like fallback is presented as a successful recommendation.
- Truncated output (`MAX_TOKENS`) and content blocked by provider safety filters return distinct errors instead of a generic parse failure.
- Provider error details are logged server-side with the API key redacted. Client responses include the provider message only outside production.
- If no in-stock variant fits the budget, return an explicit empty bundle list without calling Gemini and persist the user/assistant messages.
- The endpoint applies a per-account rate limit. Provider quota, billing alerts, and deployment-level limits must still be configured before exposing the endpoint broadly.

## Acceptance checks

- Unauthenticated calls are rejected by the session guard.
- A user cannot request recommendations for another user's recipient profile.
- Request DTO rejects unsupported occasions, extra properties, and out-of-range budgets.
- Candidate variants are in stock and within the budget using server-computed effective prices.
- Every returned bundle's sum of authoritative item prices × quantities is within budget; a bundle may have one or multiple items.
- Gemini output is schema-checked and every product, variant, quantity, stock value, and bundle total is revalidated against the live catalog.
- Chat history persists across reloads and correctly displays user and assistant roles.
- Stored history returns freshly signed media URLs after the original presigned URL expires.
- Repeating an idempotency key with the same payload returns the original response without a second provider call; a different payload returns 409.
- A sixth recommendation request within one minute for the same account returns 429.
- A product deactivated between candidate selection and validation removes that bundle without failing the whole request.
- Initial history loading is bounded to 20 messages; older history remains available through paging.
- A recipient with address province Hà Nội (legacy/current code 1) only ever sees candidates shipped to `HN` or `ALL`.
- "Xóa lịch sử" removes stored conversations after confirmation; later conversation loading returns an empty history.
- Adding a bundle whose items changed price or sold out on the server stores the current details and skips unavailable items.
- Provider/configuration errors and empty-catalog outcomes are distinct and visible to the user.
- Unit/API tests use a mocked Gemini response; live Gemini checks are separate and require configured credentials and quota.
