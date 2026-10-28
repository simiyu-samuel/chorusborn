# Twitch integration plan

Status: updated October 27, 2026. OAuth, identity validation/refresh, EventSub lifecycle, and a durable local teaching queue are implemented. A real broadcaster OAuth flow and a real `!teach` command from `developersimiyu` were verified across Twitch, the studio queue, and local persistence; see the build log. The local Groq compiler now supports review, replay, and adoption of real proposals. Production database/role management remain pending.

## Current local registration

The owner identified `developersimiyu` as the first channel and created the Twitch developer application. Register the exact OAuth redirect URL **`http://localhost:3001/auth/twitch/callback`** with no trailing slash. Choose **Game Integration** and a **Confidential** client for the server-side authorization-code flow. The backend listens on port 3001; the studio uses port 5173. Use `localhost` consistently during OAuth so browser cookies stay on the same hostname.

The callback is implemented. `.env.example` records local settings; actual credentials belong only in the ignored `.env`, loaded on server startup. Open the localhost studio, choose **Connections & setup → Connect Twitch**, and review the read-chat grant on Twitch. The connect link moves alternate-hostname visitors to localhost before starting state-bound OAuth. The live app can add an HTTPS callback once a deployment URL exists.

Current OAuth state is a random, one-time, ten-minute value bound to the initiating studio. New attempts supersede older attempts; disconnect invalidates pending and in-flight sign-ins. The callback validates the token's client ID, scope, user ID, and valid channel login. It accepts independently verified broadcasters; the app then binds or restores that user's canonical channel studio rather than enforcing one global configured login. Session cookies use `HttpOnly; SameSite=Lax` for the top-level cross-site callback; JSON-only mutation and loopback origin/host checks remain enforced. The development `/auth` proxy preserves the original Host header.

This local milestone keeps tokens only in server memory. It validates on sign-in and every 55 minutes, refreshing through one serialized operation on a 401. Transient validation failure is visible and retries after a minute; invalid refresh or changed identity ends the OAuth session. Disconnect clears local identity before requesting revocation. Restart discards authorization and requires reconnecting. Encrypted durable token storage and production channel-role authorization are still release work.

If the console displays **Redirect URIs must use HTTPS protocol**, first remove every empty redirect row. For a single URL, enter it in the existing field and use **Create/Save** rather than clicking **Add** again. Developer forum reports identify blank additional rows as a cause of this exact error, including an April 2026 report. HTTP localhost remains shown in Twitch's official local setup guide; do not switch the backend to a nonfunctional HTTPS URL merely to satisfy the form. [Forum explanation](https://discuss.dev.twitch.com/t/unable-to-use-localhost-are-redirect-url-for-oauth-implicit-grant-flow/61951), [recent report](https://discuss.dev.twitch.com/t/unable-to-create-an-application/64678).

## Initial authorization topology

Use broadcaster-authorized user tokens: each connected channel's broadcaster is the reader identity for their own channel. A separate global bot account is unnecessary for the initial release. This is a deliberate user-token topology; do not mix its conditions with the additional app-token/cloud-bot grants.

The initial OAuth scopes are `user:read:chat` for intake and optional `user:write:chat` for coach-enabled acknowledgements. Read-only operation must work without the write scope. The setup UI must explain that enabled replies appear as the broadcaster account. No automatic promotional messages or cross-channel messages are part of the product.

The adapter subscribes to `channel.chat.message`, `channel.chat.message_delete`, `channel.chat.clear_user_messages`, and `channel.chat.clear`, all version `1`. Both `condition.broadcaster_user_id` and `condition.user_id` use the verified broadcaster ID. Subscription creation uses that user's access token and checks the returned enabled subscription's type, version, conditions, and WebSocket session ID. [Chat authentication](https://dev.twitch.tv/docs/chat/authenticating/), [subscription authorization](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

## OAuth and connection lifecycle

Use the server-side authorization-code flow with an exact registered redirect URI and single-use, expiring state bound to the initiating session. Exchange codes only server-side; verify the returned identity, client ID, and scopes. Store encrypted token material outside all public DTOs and logs. Refresh credentials through a serialized per-connection operation and atomically replace the token bundle.

Validate tokens on connection and periodically while maintaining OAuth sessions; recheck the current validation guidance during implementation. Never use user-supplied broadcaster IDs to attach a channel. On revocation, stop its subscription and show **Reconnect Twitch**. [OAuth flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [validation](https://dev.twitch.tv/docs/authentication/validate-tokens/).

## EventSub transport

1. Connect to Twitch's documented EventSub WSS endpoint.
2. Read the welcome session ID; create subscriptions promptly within the server's permitted window.
3. Handle notification, keepalive, reconnect, revocation, and close separately.
4. On server-directed reconnect, migrate using the supplied reconnect URL and preserve subscriptions as documented.
5. On unexpected disconnect, reconnect and recreate needed subscriptions; show an intake gap. Twitch does not replay messages lost during that gap.

Use a bounded connection registry keyed by reader identity, reconnect backoff with jitter, timeout monitoring, and a visible host health state. Do not send application messages on the EventSub socket. [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

This lifecycle is implemented in `apps/server/src/eventsub.ts`. Multiple studios authenticated as the same reader share one connection. The transport accepts only known subscription IDs bound to the reader/channel, limits frames to 64 KiB and pending handlers to 100, waits for subscription setup if notifications race HTTP responses, and follows only an unmodified official Twitch WSS reconnect URL. Rate-limited subscriptions back off at least a minute and honor the reset time. Storage/buffer failure stops intake visibly. A failed validation or revoked OAuth session detaches its reader; disconnecting the final reader closes the socket.

## Chat command design

**Implemented now: `!teach` only.** Voting, public-link requests, and acknowledgements remain release targets. A received lesson awaits review; the coach can explicitly compile it through Groq, inspect a bounded candidate, prove it, then adopt it. Sample tactics remain separately labeled fixtures.

| Command | Actor | Effect |
| --- | --- | --- |
| `!teach <text>` | Viewer in connected source channel | Queue one bounded proposal with trusted author attribution |
| `!vote <proposal-short-id>` | Viewer during an open shortlist | Set the viewer's one current vote for that round |
| `!playbook` | Viewer | Request a public playbook link if replies are enabled; otherwise the overlay shows it |
| `!champion` | Viewer | Request champion status/link under the same reply setting |
| `!chorushelp` | Viewer | Concise instruction under the same reply setting |

All adoption, rollback, match, and membership controls remain in the authenticated host console. Votes shortlist ideas; they do not grant adoption authority. Initial product limits: 280 lesson characters, one proposal per user per 30 seconds, bounded pending queue, and operator-configured channel/model quotas. These are our admission policies, not Twitch platform limits.

Deduplicate before counting quotas or creating jobs. Store EventSub envelope identity and the underlying chat message ID with channel binding; retries must not duplicate proposals or votes. The current read-only topology has no sender account and permits the broadcaster to teach too. If optional bot replies are introduced, ignore that bot's own messages to avoid loops. Validate channel/source provenance; reject commands originating from another source channel in Shared Chat for v1.

Current parsing NFKC-normalizes the command and lesson, bounds the lesson to 280 Unicode code points, and rejects empty text, control characters, links, HTML, and code fences. Render all text and author names as text. The local queue stores this normalized lesson rather than ordinary chat or a complete raw event. An explicit coach compile action sends only the normalized lesson text to Groq under fixed grammar instructions. No text is executed, and the model has no tools. Typed local validation and source checks gate replay/adoption; no automatic compilation or adoption occurs.

## Current local persistence and limits

- `.local/chat.json` atomically stores per-channel proposals, paused state, 30-second user cooldowns, envelope/chat-message receipts, and moderation tombstones. Public/OBS state excludes the queue; reading or managing it requires current verified OAuth.
- A channel can have 50 active proposals awaiting review or adoption and at most 100 retained proposal rows. History trimming preserves still-waiting lessons. Rejection frees a pending slot.
- Receipt retention is 24 hours with a hard cap of 5,000 per channel; reaching it stops intake instead of evicting live dedupe records. Incoming notifications older than ten minutes or more than one minute in the future are ignored. These limits are application policies, not Twitch limits.
- Proposal visibility is bounded to 30 days and aged records are pruned on subsequent queue writes. Background retention jobs and production account deletion remain pending.
- Received deletion/user-clear/room-clear events redact matching source text and author fields. Tombstones prevent an earlier lesson from arriving late and reappearing. Pausing teaching does not pause moderation handling. Missed events during a connection gap cannot be reconstructed; this remains a release consideration before exposing shared public history.

## Sending acknowledgements

If the coach explicitly enables replies and grants the write scope, use Helix **Send Chat Message**, matching the authorized sender identity. Use a per-channel outbound queue, concise templates, duplicate suppression, and current provider rate-limit signals. Handle rejected/dropped messages without assuming success. Never send one reply per evaluation tick or rule activation. [Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message).

## Moderation and attribution

Coach/reviewer controls can hide text, reject proposals, pause intake, or block a contributor from this application's queue. Do not assume this grants Twitch moderation powers. A designated reviewer role is managed by the verified channel owner; a badge string supplied by a web client is not authority.

Deletion/clear subscriptions and source redaction are implemented for the local pending queue. Production reviewer roles, blocking, provider request cancellation after moderation, attribution removal controls, and history redaction for adopted tactics remain pending. An adopted tactic will need to stay versioned for replay integrity while permitting source identity/text removal; a coach can disable its behavior for the next round.

## Two-channel rivalry

The local challenge/accept/readiness implementation is described in [rivalry](rivalry.md). Each broadcaster connects independently and accepts participation. Both source channels can contribute to their own champions while the server coordinates one match. A Twitch raid event is not required for the release. Future raid-triggered invitations must be opt-in and must not treat a raid payload as a roster of individual viewers.

## Real integration evidence required

- Actual broadcaster authorization and a real viewer's `!teach` create a single attributed proposal.
- Missing write scope still permits intake; revoked credentials disable intake visibly.
- A duplicated captured event has one effect.
- Server-directed reconnect and unexpected disconnect follow different recovery paths.
- Ordinary and foreign-source Shared Chat messages do not invoke compilation.
- Two authorized broadcasters see the same match result in separate overlays.

Offline fixtures are essential for reproducibility but do not replace these live checks. Do not expose access tokens in a demo, copied URL, screenshot, or repository.

Pending compiler results are removed when the source is rejected or moderated. In-flight HTTP requests may finish at the provider, but their results cannot restore a removed source or become adoptable. See the README for three-attempt/request limits and the separate historical-data erasure limitation.
