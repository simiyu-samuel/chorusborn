# Twitch integration plan

Status: documentation verified October 26, 2026. The owner created the developer application and saved local credentials. OAuth, identity validation, refresh, and disconnect are implemented; EventSub and chat intake remain pending. A temporary real app-token check verified the credentials and revoked that token. The owner completed the real broadcaster flow and reported the returned studio showing **Connected as developersimiyu** and **Twitch account verified**.

## Current local registration

The owner identified `developersimiyu` as the first channel and created the Twitch developer application. Register the exact OAuth redirect URL **`http://localhost:3001/auth/twitch/callback`** with no trailing slash. Choose **Game Integration** and a **Confidential** client for the server-side authorization-code flow. The backend listens on port 3001; the studio uses port 5173. Use `localhost` consistently during OAuth so browser cookies stay on the same hostname.

The callback is implemented. `.env.example` records local settings; actual credentials belong only in the ignored `.env`, loaded on server startup. Open the localhost studio, choose **Connections & setup → Connect Twitch**, and review the read-chat grant on Twitch. The connect link moves alternate-hostname visitors to localhost before starting state-bound OAuth. The live app can add an HTTPS callback once a deployment URL exists.

Current OAuth state is a random, one-time, ten-minute value bound to the initiating studio. New attempts supersede older attempts; disconnect invalidates pending and in-flight sign-ins. The callback validates the token's client ID, scope, user ID, and configured channel login. Session cookies use `HttpOnly; SameSite=Lax` for the top-level cross-site callback; JSON-only mutation and loopback origin/host checks remain enforced. The development `/auth` proxy preserves the original Host header.

This local milestone keeps tokens only in server memory. It validates on sign-in and every 55 minutes, refreshing through one serialized operation on a 401. Transient validation failure is visible and retries after a minute; invalid refresh or changed identity ends the OAuth session. Disconnect clears local identity before requesting revocation. Restart discards authorization and requires reconnecting. Encrypted durable token storage and production channel-role authorization are still release work.

If the console displays **Redirect URIs must use HTTPS protocol**, first remove every empty redirect row. For a single URL, enter it in the existing field and use **Create/Save** rather than clicking **Add** again. Developer forum reports identify blank additional rows as a cause of this exact error, including an April 2026 report. HTTP localhost remains shown in Twitch's official local setup guide; do not switch the backend to a nonfunctional HTTPS URL merely to satisfy the form. [Forum explanation](https://discuss.dev.twitch.com/t/unable-to-use-localhost-are-redirect-url-for-oauth-implicit-grant-flow/61951), [recent report](https://discuss.dev.twitch.com/t/unable-to-create-an-application/64678).

## Initial authorization topology

Use broadcaster-authorized user tokens: each connected channel's broadcaster is the reader identity for their own channel. A separate global bot account is unnecessary for the initial release. This is a deliberate user-token topology; do not mix its conditions with the additional app-token/cloud-bot grants.

The initial OAuth scopes are `user:read:chat` for intake and optional `user:write:chat` for coach-enabled acknowledgements. Read-only operation must work without the write scope. The setup UI must explain that enabled replies appear as the broadcaster account. No automatic promotional messages or cross-channel messages are part of the product.

For `channel.chat.message` version `1`, bind both `condition.broadcaster_user_id` and `condition.user_id` to that verified broadcaster ID. Use EventSub WebSocket transport with that user's access token. Confirm the exact request in an early real-channel spike. [Chat authentication](https://dev.twitch.tv/docs/chat/authenticating/), [subscription authorization](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

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

## Chat command design

| Command | Actor | Effect |
| --- | --- | --- |
| `!teach <text>` | Viewer in connected source channel | Queue one bounded proposal with trusted author attribution |
| `!vote <proposal-short-id>` | Viewer during an open shortlist | Set the viewer's one current vote for that round |
| `!playbook` | Viewer | Request a public playbook link if replies are enabled; otherwise the overlay shows it |
| `!champion` | Viewer | Request champion status/link under the same reply setting |
| `!chorushelp` | Viewer | Concise instruction under the same reply setting |

All adoption, rollback, match, and membership controls remain in the authenticated host console. Votes shortlist ideas; they do not grant adoption authority. Initial product limits: 280 lesson characters, one proposal per user per 30 seconds, bounded pending queue, and operator-configured channel/model quotas. These are our admission policies, not Twitch platform limits.

Deduplicate before counting quotas or creating jobs. Store EventSub envelope identity and the underlying chat message ID with channel binding; retries must not duplicate proposals or votes. Ignore messages from the configured sender account to avoid reply loops. Validate channel/source provenance; reject commands originating from another source channel in Shared Chat for v1.

Normalize Unicode for command parsing, preserve bounded original text for review, render all text as text, and reject links/code when outside supported lesson content. A normal chat line cannot invoke the teaching agent. A malicious `!teach` line cannot change system instructions, credentials, authorization, or another channel's policy.

## Sending acknowledgements

If the coach explicitly enables replies and grants the write scope, use Helix **Send Chat Message**, matching the authorized sender identity. Use a per-channel outbound queue, concise templates, duplicate suppression, and current provider rate-limit signals. Handle rejected/dropped messages without assuming success. Never send one reply per evaluation tick or rule activation. [Send Chat Message](https://dev.twitch.tv/docs/api/reference/#send-chat-message).

## Moderation and attribution

Coach/reviewer controls can hide text, reject proposals, pause intake, or block a contributor from this application's queue. Do not assume this grants Twitch moderation powers. A designated reviewer role is managed by the verified channel owner; a badge string supplied by a web client is not authority.

Subscribe to relevant chat deletion/clear events where the same supported authorization permits; verify those exact grants in the integration spike. Deletion cancels pending work and hides source text/credit. An already adopted tactic remains versioned for replay integrity, but its public source text and identity can be removed; a coach can disable its behavior for the next round. Explicit attribution removal must work even if a deletion event was missed during a gap.

## Two-channel rivalry

Each broadcaster connects independently and accepts participation. Both source channels can contribute to their own champions while the server coordinates one match. A Twitch raid event is not required for the release. Future raid-triggered invitations must be opt-in and must not treat a raid payload as a roster of individual viewers.

## Real integration evidence required

- Actual broadcaster authorization and a real viewer's `!teach` create a single attributed proposal.
- Missing write scope still permits intake; revoked credentials disable intake visibly.
- A duplicated captured event has one effect.
- Server-directed reconnect and unexpected disconnect follow different recovery paths.
- Ordinary and foreign-source Shared Chat messages do not invoke compilation.
- Two authorized broadcasters see the same match result in separate overlays.

Offline fixtures are essential for reproducibility but do not replace these live checks. Do not expose access tokens in a demo, copied URL, screenshot, or repository.
