# Sources and verification boundaries

Checked October 26, 2026. External pages can change; recheck authorization, runtime APIs, model availability, and submission requirements when implementing or publishing. Do not infer SDK signatures or platform capabilities from a search snippet.

## Hackathon

- [Overview and deliverables](https://twitchcon-codex.devpost.com/): theme, source/video/description/session ID, judging criteria.
- [Official rules](https://twitchcon-codex.devpost.com/rules): new work requirement, eligibility, equal weighting, judging access and dates.
- [Schedule](https://twitchcon-codex.devpost.com/details/dates): deadline and displayed judging dates.

The deadline agrees across the checked pages. Judging dates differ: schedule Nov 3–6; rules Nov 5–15. Preserve access through Nov 15 and recheck organizer updates. Nairobi is UTC+3; Nov 2 at 14:00 PST converts to Nov 3 at 01:00 Nairobi.

## Twitch

- [API getting started](https://dev.twitch.tv/docs/api/get-started): the official registration example permits HTTP localhost.
- [Localhost redirect validation discussion](https://discuss.dev.twitch.com/t/unable-to-use-localhost-are-redirect-url-for-oauth-implicit-grant-flow/61951): the reported HTTPS error can be caused by an extra blank redirect row; Add creates another field rather than saving.
- [Chat overview](https://dev.twitch.tv/docs/chat/): EventSub/API chat integration direction.
- [Chat authentication](https://dev.twitch.tv/docs/chat/authenticating/): user-token and app-token contexts differ.
- [Chat message subscription](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage): exact authorization and condition fields.
- [EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/): welcome, keepalive, reconnect, revocation, unexpected gaps.
- [OAuth token flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/): server-side authorization-code flow.
- [Token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/): maintaining verified OAuth sessions.
- [Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message): optional acknowledgement authorization and response behavior.
- [Developer agreement](https://www.twitch.tv/p/en/legal/developer-agreement/): review required before deployment; a full terms audit has not been completed for this baseline.

Subscription limits, rate limits, deletion-event grants, shared-chat handling, and refresh behavior must be reconfirmed in the real integration spike. Our product quotas are not Twitch platform limits.

## AI/runtime and database

- [Codex and code generation](https://developers.openai.com/api/docs/guides/code-generation): Codex is the development collaborator; separate from the shipped compiler.
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): structured results and explicit incomplete/refusal handling. Our local contract may require an adapter for the chosen provider's supported schema subset.
- [eve getting started](https://eve.dev/docs/getting-started): current prerequisites, initialization, model connections. Read installed versioned docs before implementation.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): integrity mechanisms and foreign-key considerations.
- [PostgreSQL SELECT / locking](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE): job-claim row-lock pattern.

No current model price, exact model ID, hosting support limit, or benchmark has been adopted from memory. Provider adapters and a model bake-off are planned; no model call has been made for the application.

## Competitive reference points

- [Crowd Control](https://crowdcontrol.live/): established viewer-triggered game effects.
- [Tangia](https://www.tangia.co/): established interactive effects, AI personas, and media interactions.
- [Byte Arena](https://www.bytearena.fun/): agent gameplay and chat interaction.
- [Stream Kingdoms](https://windrax.itch.io/stream-kingdoms): creator-described persistent viewers/world across sessions and channels.
- [Choice Chamber](https://store.steampowered.com/app/359960/Choice_Chamber/): earlier crowd-controlled game mechanics.

These are primary product descriptions, not independent verification of each vendor's performance or user counts. This is a focused landscape check, not an exhaustive novelty or intellectual-property search. Our differentiation is a proposed combination to validate, not a first-ever claim.

## Local planning guidance used

OpenAI Docs, build-agents, eve, create-a-backend, create-rule, and Supabase Postgres best-practices skills were consulted for relevant planning practices. The use of the Postgres guidance does not select Supabase hosting or create a Supabase project. Skills are guidance; the owner's authorized scope and project acceptance criteria govern the work.
