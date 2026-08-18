/* Nufaa — KYC verification form.
   Front-end only: validation, file handling and the review step run in the browser.
   Nothing is transmitted; wire `submitApplication()` to the real endpoint when the
   compliance backend is live. */
(function () {
  'use strict';

  var form = document.getElementById('kyc-form');
  if (!form) return;

  var panels = Array.prototype.slice.call(form.querySelectorAll('[data-panel]'));
  var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
  var progressFill = document.getElementById('kyc-progress');
  var progressLabel = document.getElementById('kyc-progress-label');
  var backBtn = document.getElementById('kyc-back');
  var nextBtn = document.getElementById('kyc-next');
  var submitBtn = document.getElementById('kyc-submit');
  var formCard = document.getElementById('kyc-card');
  var doneCard = document.getElementById('kyc-done');
  var current = 0;
  var started = false;

  var MAX_BYTES = 8 * 1024 * 1024;
  var ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  /* ── Helpers ───────────────────────────────────────────── */
  function fieldOf(el) { return el.closest('.field'); }

  function setError(el, message) {
    var field = fieldOf(el);
    if (!field) return;
    field.classList.add('invalid');
    var msg = field.querySelector('.error-msg span');
    if (msg && message) msg.textContent = message;
    el.setAttribute('aria-invalid', 'true');
  }

  function clearError(el) {
    var field = fieldOf(el);
    if (!field) return;
    field.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
  }

  function yearsSince(dateStr) {
    var dob = new Date(dateStr);
    if (isNaN(dob)) return NaN;
    var now = new Date();
    var age = now.getFullYear() - dob.getFullYear();
    var m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  /* ── Per-control validation ────────────────────────────── */
  function validateControl(el) {
    if (el.disabled || !isVisible(el)) { clearError(el); return true; }

    var value = (el.value || '').trim();
    var required = el.hasAttribute('required') || el.dataset.required === 'true';

    if (el.type === 'checkbox') {
      if (required && !el.checked) { setError(el, 'This confirmation is required.'); return false; }
      clearError(el); return true;
    }

    if (el.type === 'radio') {
      var group = form.querySelectorAll('input[name="' + el.name + '"]');
      var checked = Array.prototype.some.call(group, function (r) { return r.checked; });
      if (required && !checked) { setError(el, 'Choose one option.'); return false; }
      clearError(el); return true;
    }

    if (el.type === 'file') {
      var file = el.files && el.files[0];
      if (required && !file) { setError(el, 'Upload this document to continue.'); return false; }
      if (file) {
        if (ACCEPTED.indexOf(file.type) === -1) {
          setError(el, 'Use a JPG, PNG, WEBP or PDF file.'); return false;
        }
        if (file.size > MAX_BYTES) {
          setError(el, 'That file is ' + (file.size / 1048576).toFixed(1) + ' MB. The limit is 8 MB.');
          return false;
        }
      }
      clearError(el); return true;
    }

    if (required && !value) { setError(el, 'This field is required.'); return false; }
    if (!value) { clearError(el); return true; }

    switch (el.dataset.validate) {
      case 'name':
        if (value.length < 2 || !/^[A-Za-zÀ-ɏ' .-]+$/.test(value)) {
          setError(el, 'Use letters, spaces, hyphens and apostrophes only.'); return false;
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          setError(el, 'That email address does not look right.'); return false;
        }
        break;
      case 'phone':
        if (!/^[0-9\s-]{7,15}$/.test(value)) {
          setError(el, 'Enter 7 to 15 digits, without the country code.'); return false;
        }
        break;
      case 'dob':
        var age = yearsSince(value);
        if (isNaN(age)) { setError(el, 'Enter a valid date.'); return false; }
        if (age < 18) { setError(el, 'You must be 18 or older to hold a Nufaa account.'); return false; }
        if (age > 110) { setError(el, 'Check the year on that date.'); return false; }
        break;
      case 'idnumber':
        if (!/^[A-Za-z0-9-]{5,20}$/.test(value)) {
          setError(el, 'Enter 5 to 20 letters, numbers or hyphens, exactly as printed.'); return false;
        }
        break;
      case 'future':
        var d = new Date(value);
        if (isNaN(d)) { setError(el, 'Enter a valid date.'); return false; }
        if (d <= new Date()) { setError(el, 'This document has expired. Use a current one.'); return false; }
        break;
      case 'amount':
        if (!/^[0-9,]+$/.test(value) || parseInt(value.replace(/,/g, ''), 10) < 25) {
          setError(el, 'Enter an amount of D 25 or more, digits only.'); return false;
        }
        break;
    }

    clearError(el);
    return true;
  }

  function validatePanel(index) {
    var controls = panels[index].querySelectorAll('input, select, textarea');
    var ok = true;
    var first = null;
    var seenRadioGroups = {};

    Array.prototype.forEach.call(controls, function (el) {
      if (el.type === 'radio') {
        if (seenRadioGroups[el.name]) return;
        seenRadioGroups[el.name] = true;
      }
      if (!validateControl(el)) {
        ok = false;
        if (!first) first = el;
      }
    });

    if (first) {
      var target = first.type === 'file' || first.type === 'radio' || first.type === 'checkbox'
        ? fieldOf(first) || first
        : first;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus && first.type !== 'file') setTimeout(function () { first.focus(); }, 350);
    }
    return ok;
  }

  /* ── Panel navigation ──────────────────────────────────── */
  function showPanel(index) {
    current = index;
    panels.forEach(function (p, i) { p.hidden = i !== index; });
    steps.forEach(function (s, i) {
      s.classList.toggle('is-active', i === index);
      s.classList.toggle('is-done', i < index);
    });

    var pct = ((index + 1) / panels.length) * 100;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressLabel) progressLabel.textContent = 'Step ' + (index + 1) + ' of ' + panels.length;

    backBtn.hidden = index === 0;
    nextBtn.hidden = index === panels.length - 1;
    submitBtn.hidden = index !== panels.length - 1;

    if (index === panels.length - 1) buildReview();

    if (started) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    started = true;
  }

  nextBtn.addEventListener('click', function () {
    if (validatePanel(current)) showPanel(current + 1);
  });

  backBtn.addEventListener('click', function () {
    if (current > 0) showPanel(current - 1);
  });

  steps.forEach(function (step, i) {
    step.addEventListener('click', function () {
      if (i < current) showPanel(i);
    });
  });

  /* Re-validate a control once the user has fixed it, and keep the
     review in step with answers given on the final panel. */
  function onEdit(e) {
    var field = fieldOf(e.target);
    if (field && field.classList.contains('invalid')) validateControl(e.target);
    if (current === panels.length - 1) buildReview();
  }
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);

  /* ── Document type drives which uploads are needed ─────── */
  var backWrap = document.getElementById('id-back-wrap');
  var backInput = document.getElementById('id-back');
  var frontLabel = document.getElementById('id-front-label');
  var idNumberLabel = document.getElementById('id-number-label');

  form.querySelectorAll('input[name="idType"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var twoSided = radio.value === 'gambian-nid' || radio.value === 'drivers-licence' || radio.value === 'voters-card';
      backWrap.hidden = !twoSided;
      backInput.dataset.required = twoSided ? 'true' : 'false';
      if (!twoSided) clearError(backInput);

      frontLabel.childNodes[0].nodeValue = radio.value === 'passport'
        ? 'Photo of your passport data page '
        : 'Photo of the front of your card ';

      var names = {
        'passport': 'Passport number',
        'gambian-nid': 'National identity (NID) number',
        'drivers-licence': 'Driving licence number',
        'voters-card': "Voter's card number"
      };
      idNumberLabel.childNodes[0].nodeValue = (names[radio.value] || 'Document number') + ' ';
    });
  });

  /* ── File inputs: preview, drag and drop, clear ────────── */
  form.querySelectorAll('.drop').forEach(function (drop) {
    var input = drop.querySelector('input[type="file"]');
    var preview = drop.querySelector('.drop-preview');
    var nameEl = drop.querySelector('[data-file-name]');
    var clearBtn = drop.querySelector('.drop-clear');

    function render() {
      var file = input.files && input.files[0];
      if (!file) {
        drop.classList.remove('has-file');
        preview.style.backgroundImage = '';
        return;
      }
      drop.classList.add('has-file');
      nameEl.textContent = file.name.length > 26 ? file.name.slice(0, 23) + '…' : file.name;
      if (file.type.indexOf('image/') === 0) {
        var url = URL.createObjectURL(file);
        preview.style.backgroundImage = 'url("' + url + '")';
      } else {
        preview.style.backgroundImage = 'none';
        preview.style.background = 'var(--sand)';
      }
      validateControl(input);
    }

    input.addEventListener('change', render);

    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        render();
      }
    });

    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      input.value = '';
      render();
    });
  });

  /* ── Review summary ────────────────────────────────────── */
  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value + 'T00:00:00');
    if (isNaN(d)) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function labelFor(name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) return '';
    if (el.type === 'radio') {
      var checked = form.querySelector('[name="' + name + '"]:checked');
      if (!checked) return '';
      var card = checked.closest('.opt-card');
      var title = card && card.querySelector('[data-opt-title]');
      return title ? title.textContent.trim() : checked.value;
    }
    if (el.tagName === 'SELECT') {
      if (!el.value) return '';
      return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
    }
    if (el.type === 'date') {
      return formatDate(el.value);
    }
    if (el.type === 'file') {
      return el.files && el.files[0] ? el.files[0].name : 'Not attached';
    }
    return (el.value || '').trim();
  }

  function buildReview() {
    var rows = [
      ['Full legal name', [labelFor('firstName'), labelFor('middleName'), labelFor('lastName')].filter(Boolean).join(' ')],
      ['Date of birth', labelFor('dob')],
      ['Nationality', labelFor('nationality')],
      ['Phone', (labelFor('dialCode') + ' ' + labelFor('phone')).trim()],
      ['Email', labelFor('email')],
      ['Residential address', [labelFor('addressLine'), labelFor('city'), labelFor('region'), labelFor('country')].filter(Boolean).join(', ')],
      ['Document type', labelFor('idType')],
      ['Document number', labelFor('idNumber')],
      ['Issuing country', labelFor('idCountry')],
      ['Expiry date', labelFor('idExpiry')],
      ['Document photo', labelFor('idFront')],
      ['Second side', backWrap.hidden ? 'Not required for this document' : labelFor('idBack')],
      ['Photo of you', labelFor('selfie')],
      ['Account use', labelFor('accountUse')],
      ['Expected monthly spend', labelFor('monthlySpend') ? 'D ' + labelFor('monthlySpend') : ''],
      ['Source of funds', labelFor('fundsSource')]
    ];

    var html = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<div class="flex items-start justify-between gap-4 py-2.5">' +
             '<dt class="text-xs text-slate2 shrink-0">' + r[0] + '</dt>' +
             '<dd class="text-sm font-semibold text-right break-words">' + escapeHtml(r[1]) + '</dd>' +
             '</div>';
    }).join('<hr class="rule">');

    document.getElementById('kyc-review').innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Submit ────────────────────────────────────────────── */
  var CFG = window.NUFAA_CONFIG || {};

  function newReference() {
    return 'NFA-' + new Date().getFullYear() + '-' +
           Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  /* Phone photos routinely run to several MB each, and FormSubmit accepts
     10 MB across the whole submission. Redraw each image at a smaller size
     before it is sent; PDFs pass through untouched. */
  function shrinkImage(file) {
    if (file.type.indexOf('image/') !== 0) return Promise.resolve(file);

    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        var maxEdge = CFG.IMAGE_MAX_EDGE || 1600;
        var scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        canvas.toBlob(function (blob) {
          // Keep the original if shrinking somehow made it bigger.
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        }, 'image/jpeg', CFG.IMAGE_QUALITY || 0.82);
      };

      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function buildPayload(reference) {
    var data = new FormData();

    /* Every answered field. Note there is deliberately no visibility test here:
       at submit time only the last panel is on screen, so filtering on that
       would drop the applicant's name, address and document details. */
    var fileInputs = [];
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'file') { fileInputs.push(el); return; }
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      if (el.value === '') return;
      data.append(el.name, el.value);
    });

    data.append('reference', reference);
    data.append('_subject', 'Nufaa KYC application ' + reference);
    data.append('_replyto', (form.querySelector('[name="email"]') || {}).value || '');
    data.append('_template', 'table');

    var jobs = fileInputs.map(function (el) {
      var file = el.files && el.files[0];
      if (!file) return Promise.resolve(null);
      return shrinkImage(file).then(function (out) { data.append(el.name, out, out.name); return out; });
    });

    return Promise.all(jobs).then(function (files) {
      var total = files.reduce(function (n, f) { return n + (f ? f.size : 0); }, 0);
      return { data: data, totalBytes: total };
    });
  }

  function submitApplication() {
    var reference = newReference();
    var endpoint = 'https://formsubmit.co/ajax/' + (CFG.FORM_ENDPOINT || '');

    return buildPayload(reference).then(function (payload) {
      var cap = CFG.MAX_TOTAL_UPLOAD_BYTES || 9 * 1024 * 1024;
      if (payload.totalBytes > cap) {
        var mb = (payload.totalBytes / 1048576).toFixed(1);
        throw new Error('Your documents come to ' + mb + ' MB, which is over the limit. ' +
                        'Retake the photos, or upload smaller files, and try again.');
      }
      return fetch(endpoint, { method: 'POST', body: payload.data });
    }).then(function (res) {
      if (!res.ok) throw new Error('We could not send your application just now. Please try again in a moment.');
      return reference;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var allValid = true;
    for (var i = 0; i < panels.length; i++) {
      var wasHidden = panels[i].hidden;
      panels[i].hidden = false;
      if (!validatePanel(i)) {
        allValid = false;
        showPanel(i);
        break;
      }
      panels[i].hidden = wasHidden;
    }
    if (!allValid) return;

    var sendError = document.getElementById('kyc-send-error');
    sendError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    submitApplication().then(function (ref) {
      document.getElementById('kyc-ref').textContent = ref;
      document.getElementById('kyc-done-name').textContent = labelFor('firstName') || 'there';
      formCard.hidden = true;
      document.getElementById('kyc-stepper').hidden = true;
      doneCard.hidden = false;
      doneCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (err) {
      /* Nothing was delivered, so the form stays exactly as the applicant left
         it and they are told plainly rather than shown a false confirmation. */
      sendError.querySelector('span').textContent = err && err.message
        ? err.message
        : 'We could not send your application just now. Please try again in a moment.';
      sendError.hidden = false;
      sendError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit for verification';
    });
  });

  showPanel(0);
})();
