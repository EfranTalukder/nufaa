/* ═══════════════════════════════════════════════════════════════
   Nufaa — form delivery settings
   Loaded before nufaa.js and kyc.js on every page.

   Forms are delivered by FormSubmit (https://formsubmit.co), which
   emails each submission to the address below. No account is needed,
   but the address must be ACTIVATED once before anything arrives:

     1. Deploy the site.
     2. Submit any form on the live site one time.
     3. FormSubmit emails that address an activation link. Open it.
     4. From then on, every submission is delivered.

   Once activated, FormSubmit will give you a random endpoint string
   (e.g. "a1b2c3d4e5f6"). Paste it into FORM_ENDPOINT below in place of
   the email address — that keeps the inbox out of the page source,
   where spam bots can read it.
   ═══════════════════════════════════════════════════════════════ */

window.NUFAA_CONFIG = {
  /* The email address (or FormSubmit random string) that receives submissions. */
  FORM_ENDPOINT: 'nufaa.now@hotmail.com',

  /* FormSubmit caps the TOTAL size of all files in one submission at 10 MB.
     KYC sends three images, so each one is downscaled in the browser before
     upload and the combined payload is checked against this ceiling. */
  MAX_TOTAL_UPLOAD_BYTES: 9 * 1024 * 1024,

  /* Longest edge, in pixels, that an uploaded photo is resized to before
     sending. 1600 keeps document text readable while cutting a typical
     phone photo from several MB to a few hundred KB. */
  IMAGE_MAX_EDGE: 1600,
  IMAGE_QUALITY: 0.82
};
