---
layout: ../../layouts/ArticleMarkdownLayout.astro
title: "Passport Photo Sizes: Make a 35 × 45 mm Photo Sheet and Print on A4"
description: "A practical guide to checking passport-photo dimensions, preparing a 35 × 45 mm print layout, exporting at 300 DPI, and avoiding printer scaling mistakes."
publishedTime: "2026-10-06"
modifiedTime: "2026-10-06"
category: "Practical guide / Photo sizing and printing"
readingTime: "5 min read"
---

A passport photo can look right on a screen and still print at the wrong size. The problem is often not the portrait itself: it is the difference between physical dimensions, image pixels, and the printer's scaling setting.

This guide explains the **35 × 45 mm layout used by my [free Indian passport photo maker](/create-passport-photo/)**, how to arrange it on A4, and how to check the printed result. It is a print-preparation guide, not an official acceptance checklist.

## First check the instructions for your application

There is no single photo file or print size that works for every passport, visa, appointment, or overseas mission. The tool's 35 × 45 mm preset does **not** mean that every Indian passport application requires that format.

Before editing, read the instructions for the specific application or appointment on [Passport Seva](https://www.passportindia.gov.in/) or the website of the embassy or mission handling it. Check:

- Whether you need a carried printed photo, a digital upload, or a photograph taken at the appointment.
- The required physical dimensions or exact pixel dimensions.
- Background, lighting, expression, face position, recency, and other appearance requirements.
- For uploads, the accepted format and file-size limit.

If your application needs a different shape, use the tool's custom dimensions or a suitable alternative. Do not resize a finished 35 × 45 mm image into another proportion: that stretches the face instead of creating a new crop.

## Millimetres, pixels, and DPI are different things

**Millimetres** describe the printed size. **Pixels** describe the image's raster dimensions. The print-resolution relationship is:

```text
pixels = millimetres ÷ 25.4 × dots per inch
```

At 300 DPI, a 35 × 45 mm photo is approximately **413 × 531 pixels**, after rounding. That is the single-photo export size of the tool's default preset. A4 is **210 × 297 mm**, approximately **2480 × 3508 pixels** at the same resolution.

These are print-layout calculations, not digital-upload requirements. If an application specifies a different pixel size, use that specification rather than assuming a 300 DPI print export is the right upload file.

Changing DPI metadata alone does not add detail to a blurry or tiny source photo. Start with a sharp, well-lit original and inspect the crop before exporting.

## Make the photo sheet

[Open the passport photo maker](/passport-photo-maker), then:

1. **Choose a portrait.** JPG, PNG, WebP, BMP, GIF, and supported AVIF inputs can be opened locally. HEIC/HEIF conversion is also local; native codec support varies between browsers.
2. **Review preparation.** The tool attempts background preparation and alignment on your device. Check the edges, hair, face position, and background yourself. You can cancel preparation or use the original if the automatic result is worse.
3. **Adjust the crop.** Zoom, move, rotate, or straighten the image. Keep the proportions your application requires; the framing guide is assistance, not an acceptance decision.
4. **Check sheet settings.** The default is 35 × 45 mm on A4 with 5 mm page margins and 3 mm gaps. That layout fits 5 columns and 6 rows: **30 copies**. Changing dimensions, margins, or gaps changes the count.
5. **Choose border and cut-line settings.** A border may help with trimming, but turn it off if your instructions require a borderless photo. Cut lines are only cutting aids.
6. **Download the A4 PDF.** Keep the single-photo JPEG for workflows that explicitly need an individual image. The A4 JPEG is an alternative sheet export, not the same file as the single photo.

Oversized sources are bounded before persistent storage and processing, so this is not an archival-original editor. Keep your original file separately if you need it for another purpose.

## Print at Actual size, not Fit to page

For the A4 PDF:

- Select **A4 paper**.
- Select **Actual size / 100%** where the viewer or printer exposes that option.
- Disable **Fit to page**, shrink-to-printable-area, or other scaling modes that change the photo dimensions.
- Review paper, colour, finish, and quality settings against your application's instructions. A PDF cannot make unsuitable paper or a poor source portrait acceptable.
- Print a sample and measure one photo with a ruler before printing the whole batch.

The PDF uses an A4 page and requests disabled print scaling, but the viewer, printer driver, or print shop can still override those preferences. A ruler check is more useful than trusting the on-screen preview alone.

If a print service resizes the file, ask whether it can print the PDF at its original page size. Provider availability, paper choices, pricing, and installed-app handoff depend on the service and your location; the tool does not place a printing order for you.

## Common mistakes

**The photo looks stretched.** Re-crop at the required width-to-height ratio. Do not force an existing photo into a different shape by changing width and height independently.

**The print is smaller than 35 × 45 mm.** Check for Fit to page, shrinking, or a print service's automatic resizing. Confirm A4 and 100%, then measure a sample.

**The exported file is sharp, but the face is not.** More pixels or higher DPI cannot restore missing detail. Use a clearer, closer original rather than relying on aggressive enlargement.

**The background removal damages hair or clothing.** Inspect the automatic result, adjust the crop, or keep the original. Automatic preparation is not a substitute for suitable lighting and background.

**The website says the sheet is ready. Does that mean acceptance is guaranteed?** No. Ready means an export can be generated. Only the authority handling your application can determine acceptance.

## Where your photo goes

Editing and export happen in the browser. The app's Worker does not receive or store your portrait or PDF. Browser-local drafts can remain on the device, so use **Clear saved photos** on a shared computer.

The page still downloads code and models and uses analytics, optional support-payment endpoints, and bounded failure diagnostics. Local processing does not mean there are no network requests. If you explicitly share or upload a PDF to a print provider, that provider receives it.

[Try the free photo maker](/passport-photo-maker), read the [build story](/writing/building-a-private-indian-passport-photo-tool/), or learn about the [privacy and testing decisions](/writing/local-photo-processing-privacy-testing/). Always return to the relevant official instructions before submitting or printing for an application.
