# WebRTC environment checks — 2026-11-05

Chrome headless on macOS; this is not Safari/iOS coverage. Tests use short-lived
v2 sessions, the bundled English speech sample, English-to-Spanish translation,
and the changed SDK source. Keys are read by Node from local files and are never
written to reports or the browser. All created sessions were deleted (HTTP 204).

| Scenario | JS LiveKit | Observed server | Result |
| --- | --- | --- | --- |
| dev, normal | 2.22.4 | 1.13.11 | PASS: running ACK, translated text, audio energy 0.0061, one startup event |
| dev, first set_task dropped | 2.22.4 | 1.13.11 | PASS: resend after 1251ms, running ACK, translated text, audio energy 0.0413 |
| prod, normal | 2.22.4 | 1.8.4 | FAIL: /rtc/v1/validate returned 404; disconnected before task confirmation, no set_task sent |
| prod, runtime control with unchanged confirmation logic | 2.13.0 | 1.8.4 | PASS: running ACK, translated text, audio energy 0.0135 |

Reports alongside this file contain startup timing, command counts, message
counts, RTP/audio-energy evidence and cleanup results. No task retries occurred
after stop. A dev normal run also exercised a natural retry and returned
`event: unchanged`, confirming that startup does not depend on `event: started`.

The production control run used the same changed SDK source and smoke page,
with only the LiveKit runtime aliased to the previously installed 2.13.0 bundle
in an external diagnostic script. The working dependency and lockfile remain
2.22.4. This isolates the observed failure to the new-client/old-server path;
one successful control run is not a general stability guarantee.

## Release gate

The PR is available for review; production deployment remains blocked.
Production must be upgraded to a supported LiveKit server and rechecked with
2.22.4. Alternatively, a separate change retaining 2.13.0 would need explicit
scope agreement; this branch preserves the requested 2.22.4 upgrade.

## Reproduce

Install workspace dependencies and Google Chrome, then run from the repository
root (replace the file paths with your local key files):

```sh
PALABRA_DEV_API_KEY_FILE=/path/to/dev-key.txt node scripts/smoke-webrtc.mjs dev normal
PALABRA_DEV_API_KEY_FILE=/path/to/dev-key.txt node scripts/smoke-webrtc.mjs dev drop-first
PALABRA_PROD_API_KEY_FILE=/path/to/prod-key.txt node scripts/smoke-webrtc.mjs prod normal
```

The scripts return a nonzero status on a failed ACK, missing translation,
audio still at silence energy, duplicate/missing startup event, retry after
stop, or session cleanup failure. Results are written under ignored tmp/.
