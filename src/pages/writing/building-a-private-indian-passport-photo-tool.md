---
layout: ../../layouts/ArticleMarkdownLayout.astro
title: "How I Built a Privacy-First Indian Passport Photo Maker"
description: "How Chintan Puggalok built a free Indian passport photo maker: local photo editing, 35 × 45 mm and A4 printing, browser privacy, testing, and the mobile roadmap."
readingTime: "12 min read"
publishedTime: "2026-09-30"
modifiedTime: "2026-10-06"
---

I built [Passport Photo Sheet India](https://create-passport-photo.chintanpuggalok.com/) to make one small but stressful task easier: turn a portrait into a correctly sized photo sheet without having to learn an image editor or upload a personal photo to a server.

The project began as a simple browser utility. It grew into a local image-processing pipeline with automatic framing, background removal, A4 PDF/JPEG export, browser-local drafts, optional support payments, and a fairly demanding test matrix. This is the build journey so far—and the evidence-based plan for what comes next.

## The constraints came first

A passport-style portrait is personal data. My first product boundary was therefore architectural: decode, crop, prepare, and export the image in the browser. The Worker handles payment endpoints and static assets; it never receives the portrait or finished PDF. The browser keeps a resumable draft locally, and users can clear saved photos. If someone sends a PDF to a printing service, that happens only after they choose to share or upload it.

The other boundary is just as important: this is a photo-preparation tool, not an official acceptance checker. It can help with dimensions and framing, but it cannot decide whether a government office or foreign mission will accept a particular image. Application-specific instructions remain authoritative.

## September 15–16: make the print job work

The first version focused on the complete useful path: choose a portrait, crop it to the 35 × 45 mm Indian passport-style proportion, place copies on A4, and download a printable result. The app is a static browser interface, deployed with Cloudflare Workers Static Assets; a small Worker is used only where server-side payment verification is required.

Print output quickly became the real correctness test. A preview that looks right is not enough if a PDF is clipped, scaled by the browser, or has a different layout from the JPEG. I consolidated export around one rendered A4 sheet so the PDF, 300 DPI JPEG, and print action share the same geometry. Regression checks cover the PDF bounds, page size, and image dimensions. The print guidance tells people to choose Actual size / 100%, not “Fit to page.”

## Photo sizing and printing

The default 35 × 45 mm preset is a **tool format, not a universal requirement** for every Indian passport, visa, appointment, or overseas mission. First check [Passport Seva](https://www.passportindia.gov.in/) or the relevant mission's instructions: do you need a carried print, a digital upload with specified pixels and file size, or a photo taken at the appointment?

For printing, millimetres describe physical size and pixels describe raster dimensions:

```text
pixels = millimetres ÷ 25.4 × dots per inch
```

At 300 DPI, 35 × 45 mm is approximately **413 × 531 pixels**, after rounding. A4 is **210 × 297 mm**, approximately **2480 × 3508 pixels** at the same resolution. These are print calculations, not official digital-upload specifications. Changing DPI metadata does not restore detail to a blurry source.

To [make your photo sheet](/passport-photo-maker):

1. Choose a clear portrait. Common browser image formats and local HEIC/HEIF conversion are supported; AVIF availability depends on the browser's codec.
2. Review automatic background preparation and alignment. Keep the original if the result damages hair or clothing, and adjust zoom, position, rotation, and straightening yourself.
3. Check the dimensions and sheet settings. The default 35 × 45 mm photos, 5 mm page margins, and 3 mm gaps fit **5 columns × 6 rows: 30 copies** on A4. Custom sizes, margins, and gaps change that count.
4. Choose border and cut-line settings against your application instructions. A trimming aid is not an acceptance requirement.
5. Download the A4 PDF for the sheet, or the single-photo JPEG if your workflow specifically requires an individual image. They are different exports.
6. Print on **A4 at Actual size / 100%**, not Fit to page or shrink-to-printable-area. Measure a sample with a ruler before printing the batch: viewers, drivers, and print services can override scaling preferences.

A stretched face needs a new crop at the required proportion, not independent resizing of width and height. A soft portrait needs a better original, not just more output pixels. Readiness to export is not official acceptance. The tool does not place printing orders; provider availability and installed-app handoff depend on your service, location, and device.

## Make alignment useful, but keep it editable

The next challenge was reducing the image-editing knowledge a first-time user needs. I added on-device face and eye detection, background segmentation, white compositing, and automatic framing. The app uses face geometry and the selected photo shape to estimate scale and eye level, then aligns the head against a guide. The user can still drag, zoom, rotate, and straighten the result; automatic output is a starting point, not a locked decision.

This was deliberately a browser-based ML path. MediaPipe's runtime and models are fetched for the browser and run on-device. The code analyzes a bounded image, refines the mask in patches, and releases workers and buffers after jobs. It is not a server-side photo API, and inference still has the usual limits around curls, flyaway hair, lighting, occlusion, and clothing edges.

## The real-world input problem: phones and file formats

A desktop JPG is the easy case. People also bring iPhone HEIC/HEIF images, rotated camera photos, huge originals, and browsers with incomplete worker or canvas support. I added local HEIC conversion, support for common browser image formats, EXIF-orientation handling, and a compatibility path that retries processing on the main thread when a worker path is unavailable.

Memory needed its own guardrails. The current app accepts uploads up to 40 MB, rejects sources above 120 megapixels before decode, checks image dimensions from a small header slice, and bounds stored source photos to an 1800 px long edge. Vision analysis is bounded further. These controls reduce avoidable allocation, but they are not a promise that every phone stays below a fixed peak-memory number; browser decoders and operating systems manage memory differently.

The UI also saves an in-progress draft in IndexedDB so the user can return after opening the print flow. That convenience comes with a privacy responsibility: explain local persistence in the interface and make clearing saved photos easy, especially on shared devices.

### Draft persistence across browsers

The October 6 audit exposed a portability assumption: an iPhone WebKit test runtime accepted ordinary IndexedDB objects and byte buffers but rejected Blob writes. That is not evidence that every physical iPhone fails the same way, but it justified a more portable storage format.

The shared writer now saves encoded ArrayBuffers alongside MIME types, reconstructs Blobs on reads, and supports older Blob records. Tests restore zoom, fine rotation, and sheet margins—not just a visible workspace. A clear-generation guard also prevents an asynchronous write from repopulating drafts after the user clears saved photos; the regression deliberately pauses encoding, clears storage, and then releases the pending write.

## Testing the whole flow, not just the happy path

The browser differences showed up in places unit tests could not catch. The project now has unit tests for layout math, framing, image metadata, PDF generation, and payment validation, alongside Playwright flows for uploads, editing, and export. Browser coverage includes Chromium, Firefox, and WebKit profiles, plus cases for EXIF orientation, HEIC conversion, oversized photos, transparent inputs, cancellation, and output geometry.

Some platform behaviors still cannot be proven by desktop automation. For example, a browser cannot reliably inspect which print apps are installed or force a PDF into a particular app. The app downloads the PDF first and presents provider destinations afterward; installed-app handoff depends on the device and operating system. That is less magical than pretending to control the handoff, but it is more honest and testable.

### Prioritize essential paths, not just test counts

The audit strengthened assertions that had previously checked less than their names suggested. Print PDF now clicks the action and inspects a real A4 PDF Blob in a mocked popup. Payment tests submit all three support presets and the minimum custom amount; an order-error retry actually completes a second successful mocked verification.

Cases are classified high or low priority. Core upload/edit/export, privacy, payment validation, and data-loss protections remain high, including important failure paths. Small, low-risk presentation changes can use a representative Chromium/Firefox/iPhone WebKit gate; processing, storage, payment, API, CSP/security, dependency, gate, and release changes still require the full suite.

On October 6, the shorter gate covered **62 selected unit cases and 166 browser executions**, with the browser portion taking about five minutes. The complete gate passed **76 unit cases and 978 browser executions**. Repeated profiles are executions, not independent features. This runner lacks Firefox WebGL, so actual inference is required in Chromium and WebKit; Firefox still exercises editing, storage, fallback, and exports. See the [case audit and remaining gaps](https://github.com/chintanpuggalok/passport-photos/blob/main/test/TEST_PRIORITY_AUDIT.md).

Mocked payments do not establish live card or UPI settlement. Synthetic geometry and successful segmentation do not establish quality across every skin tone, hairstyle, or real portrait. User-agent profiles and mocked sharing are not physical-device, native-app, or printer certification.

## Payments and observability without moving photos server-side

Photo creation and downloads stay free. I added an optional one-time Razorpay contribution flow to help support hosting. Order creation and payment-signature verification happen in the Worker, with credentials kept server-side; there is no account system or photo storage service.

I also added bounded failure diagnostics for issues such as image preparation, PDF export, and payment. The reports use allowlisted categories and limited technical metadata. They do not contain image bytes, filenames, arbitrary error messages, or stacks. This helps investigate failures without turning photo content into debugging data.

### Make error reports useful without exposing photos

Historical Cloudflare CSP/resource reports lacked the blocked URL. Current Chromium/Firefox/WebKit production probes loaded checkout without CSP violations or page errors, while observing a failing speculative Razorpay SDK `build/undefined` request. Neither observation proves every historical cause; widening CSP to silence warnings would be the wrong response.

Reports now include fixed resource labels such as `google_tag`, `razorpay_static`, and `vision_asset`, never raw URLs or query strings. The Worker validates the labels and accepts older clients. Locally handled image-decoder rejection is not mislabeled as a script failure, and speculative links are not confused with execution failures; actual resource and enforced CSP failures still report.

Deferring diagnostics also needed an early-error guard. A small listener temporarily queues up to ten events, then the deferred collector removes those listeners, deletes the queue, and applies the same privacy filters to buffered and subsequent failures. A regression aborts the Google tag while delaying the collector, rather than merely checking for a `defer` attribute.

Local processing does not mean zero network traffic: code/models, analytics, optional support payments, and bounded diagnostics still use the network. Nor does it mean zero local persistence: clear saved photos on shared devices and keep your original file separately, since stored sources are bounded for memory safety.

## What the measurements say—and do not say

The browser app has been profiled with large photos, and the memory work found substantial avoidable allocations. That is useful, but a desktop renderer reading is not a measurement of a complete iOS or Android app. The target for a future native-assisted path is at most 600 MB total peak RAM across the UI, decoding, inference, post-processing, and export—not merely a model process.

I also evaluated native MODNet inference at a 640 px long edge on a 50-photo development set. With conservative mask cleanup, mean boundary alpha error was 7.49% lower than the current comparison pipeline; 35 cases improved and 15 regressed. The isolated evaluation process peaked at 286 MB, excluding the application UI and integrated mobile flow. This is a promising experiment, not independent validation and not a production model switch. Some difficult hair and clothing cases still regress.

## The next roadmap

The roadmap is intentionally staged so each step has evidence before it becomes a product promise:

1. **Prototype a native inference bridge.** Keep the web UI, decode to the existing 1800 px source limit, run face/eye analysis and matting sequentially, and pass a file URI plus small geometry metadata—not full image buffers—back to the UI.
2. **Measure the entire journey on real phones.** Test iOS and Android with large JPG, PNG, and HEIC inputs, repeated uploads, cancellation, export, and memory pressure. The 600 MB target applies to the complete app, not the isolated inference process.
3. **Refine edges only where it helps.** Try a higher-resolution head crop, improve detached-background cleanup without erasing curls, and evaluate color decontamination to reduce background-colored fringes. Review every change on both light and dark backgrounds.
4. **Keep uncertain cases visible.** Automatic quality checks should advise about soft, distant, low-resolution, or tilted portraits without claiming official acceptance. Manual crop controls remain available when models are wrong.
5. **Consider a custom model later.** Training is premature until the simpler pipeline passes an independent portrait set, has suitable data rights, and shows a measurable need that existing models cannot meet.

A native pose model for anatomical shoulder landmarks is also a possible later experiment. The current web app uses a rough shoulder silhouette from the existing foreground mask; it does not claim to detect shoulder joints. Any extra model would need to justify its latency and memory cost.

## What I learned

The hard part was not adding another slider or model. It was making the dimensions survive export, making local inference recover when browser capabilities differ, and making privacy claims match the actual data flow. Every intelligent shortcut needs a manual correction path, every memory optimization needs a real measurement, and every statement about passport compliance needs to point back to the relevant official instructions.

The result is still evolving. The web version solves the immediate print-sheet workflow; native inference is a research direction with explicit quality and memory gates, not a promised rewrite. You can [try the tool](https://create-passport-photo.chintanpuggalok.com/) and check the [official Passport Seva instructions](https://www.passportindia.gov.in/) for your specific application.

### Quick answers

**Does the photo get uploaded?** No. Editing and export happen in the browser, and the Worker does not receive the photo. A user-selected print provider receives a PDF only if the user explicitly shares or uploads it.

**Does this tool guarantee a passport photo will be accepted?** No. It prepares a 35 × 45 mm layout and offers framing advice; it is not an official validator. Check the instructions for the exact application or mission.

**Is there a native phone app today?** No. The current product is a web app. Native inference is a proposed next step, gated on real-device quality and total-memory tests.

[Open the free passport photo maker](/passport-photo-maker) or inspect the [source repository](https://github.com/chintanpuggalok/passport-photos). This article combines the original build journey with the October 6 printing, storage, diagnostics, and testing updates.
