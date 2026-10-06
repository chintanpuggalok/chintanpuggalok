---
layout: ../../layouts/ArticleMarkdownLayout.astro
title: "How I Built a Privacy-First Indian Passport Photo Maker"
description: "The full build journey: browser-based photo editing, print-ready A4 exports, cross-browser testing, privacy trade-offs, and the measured roadmap for mobile."
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

## Make alignment useful, but keep it editable

The next challenge was reducing the image-editing knowledge a first-time user needs. I added on-device face and eye detection, background segmentation, white compositing, and automatic framing. The app uses face geometry and the selected photo shape to estimate scale and eye level, then aligns the head against a guide. The user can still drag, zoom, rotate, and straighten the result; automatic output is a starting point, not a locked decision.

This was deliberately a browser-based ML path. MediaPipe's runtime and models are fetched for the browser and run on-device. The code analyzes a bounded image, refines the mask in patches, and releases workers and buffers after jobs. It is not a server-side photo API, and inference still has the usual limits around curls, flyaway hair, lighting, occlusion, and clothing edges.

## The real-world input problem: phones and file formats

A desktop JPG is the easy case. People also bring iPhone HEIC/HEIF images, rotated camera photos, huge originals, and browsers with incomplete worker or canvas support. I added local HEIC conversion, support for common browser image formats, EXIF-orientation handling, and a compatibility path that retries processing on the main thread when a worker path is unavailable.

Memory needed its own guardrails. The current app accepts uploads up to 40 MB, rejects sources above 120 megapixels before decode, checks image dimensions from a small header slice, and bounds stored source photos to an 1800 px long edge. Vision analysis is bounded further. These controls reduce avoidable allocation, but they are not a promise that every phone stays below a fixed peak-memory number; browser decoders and operating systems manage memory differently.

The UI also saves an in-progress draft in IndexedDB so the user can return after opening the print flow. That convenience comes with a privacy responsibility: explain local persistence in the interface and make clearing saved photos easy, especially on shared devices.

## Testing the whole flow, not just the happy path

The browser differences showed up in places unit tests could not catch. The project now has unit tests for layout math, framing, image metadata, PDF generation, and payment validation, alongside Playwright flows for uploads, editing, and export. Browser coverage includes Chromium, Firefox, and WebKit profiles, plus cases for EXIF orientation, HEIC conversion, oversized photos, transparent inputs, cancellation, and output geometry.

Some platform behaviors still cannot be proven by desktop automation. For example, a browser cannot reliably inspect which print apps are installed or force a PDF into a particular app. The app downloads the PDF first and presents provider destinations afterward; installed-app handoff depends on the device and operating system. That is less magical than pretending to control the handoff, but it is more honest and testable.

## Payments and observability without moving photos server-side

Photo creation and downloads stay free. I added an optional one-time Razorpay contribution flow to help support hosting. Order creation and payment-signature verification happen in the Worker, with credentials kept server-side; there is no account system or photo storage service.

I also added bounded failure diagnostics for issues such as image preparation, PDF export, and payment. The reports use allowlisted categories and limited technical metadata. They do not contain image bytes, filenames, arbitrary error messages, or stacks. This helps investigate failures without turning photo content into debugging data.

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

## Further reading

- [Passport photo sizes and printing a 35 × 45 mm sheet on A4](/writing/passport-photo-size-a4-printing/): practical preparation and printing steps, with application-specific requirements kept separate.
- [Local photo processing, privacy, and tests that catch real failures](/writing/local-photo-processing-privacy-testing/): an October 6 follow-up on draft portability, safe diagnostics, and the test-priority audit.
