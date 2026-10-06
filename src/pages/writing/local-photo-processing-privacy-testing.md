---
layout: ../../layouts/ArticleMarkdownLayout.astro
title: "Building a Local Photo Tool: Privacy, Browser Storage, and Tests That Catch Real Failures"
description: "Engineering notes from a browser-based passport photo maker: local image processing, WebKit draft persistence, privacy-safe error reports, and high-priority user-flow tests."
publishedTime: "2026-10-06"
modifiedTime: "2026-10-06"
category: "Engineering / Browser reliability and privacy"
readingTime: "6 min read"
---

For a photo-editing tool, “privacy-first” should describe a data flow, not just a line on the homepage. A recent audit of my [Indian passport photo maker](/create-passport-photo/) made that distinction concrete: broader browser tests exposed a draft-storage failure, and production error reports showed where observability lacked useful context.

This is a follow-up to the [original build story](/writing/building-a-private-indian-passport-photo-tool/). The interesting changes were not a new model or framework. They were small boundaries that made the existing browser workflow more reliable and its claims easier to verify.

## Keep image bytes out of the backend

The browser decodes the uploaded photo, prepares its background, applies crop and rotation, renders the A4 sheet, and creates the PDF or JPEG. The Cloudflare Worker serves assets and handles support-payment and diagnostic endpoints. It does not receive the portrait or exported PDF.

That boundary is testable. Upload and export checks can watch outgoing requests and reject photo-bearing uploads. Diagnostics can use a strict schema that refuses arbitrary fields. The interface must also disclose the other places data may go:

- A draft can be stored locally in IndexedDB.
- Code and on-device inference models are downloaded over the network.
- Analytics and limited failure reports are sent separately from image content.
- A print provider receives a PDF only after the user explicitly shares or uploads it there.

“Processed locally” is not the same claim as “makes no network requests,” “leaves no data on this device,” or “is automatically offline.” Keeping those statements separate avoids misleading people.

## A successful upload does not prove draft persistence

The original upload/editor tests passed, but the expanded iPhone WebKit profile could not save its local draft. A minimal probe helped separate the layers: IndexedDB accepted ordinary objects and byte buffers, but rejected a Blob write with an error about preparing Blob/File data for the object store.

This was a finding in the test runtime, not proof that every physical iPhone has the same limitation. It still exposed a portability assumption in the app.

The storage writer now packs encoded photo bytes into ArrayBuffers alongside their MIME types. Reads rebuild Blobs for the image pipeline, while still accepting older records that already contain Blobs. The draft retains crop and sheet controls rather than just enough information to reopen an editor.

Encoding introduces an asynchronous boundary. If the user clears saved photos while a write is preparing bytes, that older write must not finish afterward and repopulate storage. A clear-generation guard cancels it. The browser regression deliberately delays encoding, clears the records, releases the delay, and checks that the database stays empty.

The broader lesson: test the user-visible promise—restore the adjustments and honour clearing—not merely whether a storage API exists.

## Useful diagnostics do not need raw URLs or filenames

The retained Cloudflare logs contained CSP violations and resource-load errors, but older payloads did not identify the blocked resource. A generic “payment script failed” was not enough to distinguish a checkout dependency, an unavailable CDN, or an old policy.

Widening Content Security Policy until errors disappear would have been the wrong fix. Current production probes in Chromium, Firefox, and WebKit loaded the checkout script without CSP violations or page errors. They also observed a failing speculative request from Razorpay's SDK to a `build/undefined` URL. That is not evidence that the app should permit every possible script origin, nor proof that every historical error has been resolved.

The updated reports attach fixed labels such as `google_tag`, `razorpay_static`, and `vision_asset`. They do **not** send raw URLs, query strings, photo filenames, arbitrary error messages, or stack traces. The Worker validates those labels and still accepts older clients.

Classification matters too. A locally rejected image decoder is not a failed JavaScript download. An optional speculative link is not the same as an execution failure. Those events are handled in their appropriate paths, while actual script, network, and enforced CSP failures remain observable.

## Deferring a collector must not lose early failures

Making diagnostics non-blocking creates another small race: an asynchronous script can fail before the full collector has executed.

The page uses a tiny early listener that temporarily queues up to ten error events. When the deferred collector takes over, it removes those listeners, deletes the temporary queue, and runs the buffered events through the same privacy filters as subsequent failures.

A regression test aborts the Google tag while delaying the collector. That is more convincing than checking that a `defer` attribute exists. It verifies the reason the bootstrap is there without requiring a live analytics provider.

## Test happy paths through their outputs

The audit strengthened several tests whose names had promised more than their assertions established:

- **Print PDF:** previously covered mostly by checking which function the source called. A browser check now clicks the print action and inspects an actual A4 PDF Blob passed to a mocked popup. It does not pretend to operate a physical printer.
- **Draft reopening:** previously checked workspace visibility. It now verifies restored zoom, fine rotation, and sheet margin in representative browser engines.
- **Support amounts:** previously selected one preset but submitted only a minimum custom amount. It now checks ₹49, ₹99, and ₹199 presets plus the exact-minimum custom value in paise.
- **Checkout retry:** previously established that the button became enabled again. It now completes a second successful mocked order and verification.

Mocked payments are useful for app contracts and fail-closed behavior. They are not proof of a successful live card transaction or UPI settlement. Real provider checks remain explicit, test-mode operations.

## A smaller gate is useful only if it retains the essential checks

Every case is classified high or low priority. High includes core upload/edit/export flows, actual inference on supported test engines, payment validation, privacy boundaries, and data-loss protections. Important failure paths are high even when they are not happy paths.

The representative high browser gate runs Chromium, Firefox, and an iPhone WebKit profile. On this runner Firefox lacks WebGL, so actual inference is required in Chromium and WebKit rather than silently claimed for Firefox. Firefox's editing, fallback, storage, and export paths still run.

In the October 6 audit, the high gate covered **62 selected unit cases and 166 browser executions** and took about **five minutes** for its browser portion. The complete local gate passed **76 unit cases and 978 browser executions**, retaining the extended compatibility matrix. Repeated device profiles are executions, not hundreds of independent product features.

Small, low-risk presentation changes can use the shorter gate. Payments, APIs, CSP/security, image processing, storage, exports, dependencies, test-gate changes, and releases still require the full suite. Risk is about what changed, not how few lines changed. The [case audit in the source repository](https://github.com/chintanpuggalok/passport-photos/blob/main/test/TEST_PRIORITY_AUDIT.md) records the policy and remaining coverage limits.

## What these checks still cannot promise

Synthetic geometry checks and a successful segmentation run do not establish quality across skin tones, difficult hair, lighting, clothing, or every real portrait. Device profiles do not reproduce a physical phone's camera picker, memory pressure, native share targets, or installed print-provider apps.

Most importantly, software tests cannot guarantee official passport-photo acceptance. The tool prepares a crop and print layout; application-specific instructions and the authority handling the application remain authoritative.

[Try the tool](/passport-photo-maker), use the [photo sizing and A4 printing guide](/writing/passport-photo-size-a4-printing/), and review the [source](https://github.com/chintanpuggalok/passport-photos) if you want to inspect the boundaries rather than take the privacy claim on trust.
