# PBN-5732 WebRTC task confirmation

## Requirements and design

Implement reliable set_task retry until task_status / set_task / running from
palabra_translator_* on the default data channel, for existing or late
participants. Register handlers before sending. Retry after 1250ms, multiply by
1.5, cap at 5000ms, and time out after 30000ms including translator readiness.
Pin livekit-client 2.22.4. Test dev and prod independently; open a PR only if both
work. Do not merge or publish.

The transport owns one confirmation operation at a time. Serialize immutable
configuration snapshots; queued updates start after the active ACK. A control
command, disconnect or active failure cancels queued updates. Ignore unrelated
participants/topics/commands, malformed JSON, and ACKs before an actual send.
Buffer immediate ACKs until publication succeeds. Cleanup timers and listeners
on every terminal path. Preserve raw data events and use LiveKit's fourth
DataReceived argument as topic. Stop during client startup prevents a late
startup event and always releases audio/session resources.

## Execution

- [x] Clone into an isolated checkout and create codex/PBN-5732-webrtc-task-confirmation.
- [x] Establish the baseline: 225 SDK tests passed.
- [x] Write regression tests and observe failures on the old behavior.
- [x] Implement confirmation, cancellation, serial updates and lifecycle cleanup.
- [x] Upgrade LiveKit and regenerate only related lockfile entries.
- [x] Add source typechecking to build and adapt TypeScript module resolution.
- [x] Independent review, reproduce and fix both important findings.
- [x] Add reproducible real-session browser smoke checks and run dev/prod.
- [x] Prepare PR at the user’s explicit follow-up request; production release remains blocked.

## Review decisions and evidence

Serial updates replace the initial idea of aborting an old task on a new call:
the protocol has no request IDs, so supersession could let an old ACK confirm
settings that were never delivered. A successful publish is required before
accepting an immediate ACK; outstanding publications are serialized across
timeout/cancellation. Delayed duplicate ACKs still cannot be perfectly correlated
without server support; callers should await configuration updates.

The second independent finding was unbounded reliable end_task on disconnect.
The final implementation gives it 2000ms, then closes the room in finally.
The review findings were reproduced by five failing behavioral tests before
fixing; the full SDK build passed after the fixes.

Typecheck decision: ESNext/bundler resolution and ES2021 DOM libraries match
LiveKit's declarations. skipLibCheck applies only to dependency declarations:
LiveKit 2.22.4 ships imports of dev-only @livekit/throws-transformer/throws.
SDK source and tests are typechecked. The explicit tsc step prevents a green
Vite build from masking SDK type errors.

See ../../testing/2026-11-05-webrtc-environments.md for real environment evidence.

Final verification: 252/252 SDK tests; lint, tsc --noEmit, Vite bundle/declarations, git diff --check and smoke-script syntax passed. Real dev normal/drop-first passed; prod 2.22.4 failed; prod control with 2.13.0 passed. The initial PR gate was held; the user subsequently explicitly requested the PR and a client version bump to 0.0.12. Production release remains blocked.
