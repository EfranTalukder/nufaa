/* Nufaa — shared site behaviour. Loaded at the end of every page. */
(function () {
  'use strict';

  /* ── Mobile menu ─────────────────────────────────────────── */
  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');

  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ── Scroll-aware nav ────────────────────────────────────── */
  var nav = document.getElementById('main-nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('nav-scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Scroll reveal ───────────────────────────────────────── */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Count-up numbers ────────────────────────────────────── */
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        countObserver.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count-to'));
        var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var start = performance.now();
        var duration = 1400;
        (function tick(now) {
          var p = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toLocaleString('en-GB', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ── Spotlight cards follow the cursor ───────────────────── */
  document.querySelectorAll('.spotlight').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ── Filter chips (marketplace) ──────────────────────────── */
  var chipGroup = document.querySelector('[data-filter-group]');
  if (chipGroup) {
    var items = document.querySelectorAll('[data-category]');
    var emptyState = document.getElementById('filter-empty');
    chipGroup.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      chipGroup.querySelectorAll('[data-filter]').forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });
      var want = chip.getAttribute('data-filter');
      var shown = 0;
      items.forEach(function (item) {
        var match = want === 'all' || item.getAttribute('data-category') === want;
        item.hidden = !match;
        if (match) shown++;
      });
      if (emptyState) emptyState.hidden = shown > 0;
    });
  }

  /* ── Newsletter sign-up (inline feedback, never an alert) ── */
  document.querySelectorAll('[data-subscribe]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var note = form.parentElement.querySelector('[data-subscribe-note]');
      var value = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!ok) {
        if (note) {
          note.textContent = 'That email address does not look right. Check it and try again.';
          note.style.color = '#C0392B';
        }
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      if (note) { note.textContent = ''; }

      var body = new FormData();
      body.append('email', value);
      body.append('_subject', 'Nufaa launch list sign-up');
      body.append('_template', 'table');

      fetch('https://formsubmit.co/ajax/' + (window.NUFAA_CONFIG || {}).FORM_ENDPOINT, {
        method: 'POST',
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('send failed');
        input.value = '';
        if (note) {
          note.textContent = 'You are on the list. We will write when the Gambia rollout opens.';
          note.style.color = 'var(--pine)';
        }
        if (btn) { btn.textContent = 'Added'; }
        setTimeout(function () { if (btn) { btn.textContent = original; btn.disabled = false; } }, 2600);
      }).catch(function () {
        if (note) {
          note.textContent = 'We could not add you just now. Please try again in a moment.';
          note.style.color = '#C0392B';
        }
        if (btn) { btn.textContent = original; btn.disabled = false; }
      });
    });
  });

  /* ── Contact form: inline validation, inline result ──────── */
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    var rules = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      tel: /^[0-9+\s-]{7,18}$/
    };

    var checkField = function (el) {
      var wrap = el.closest('.field');
      if (!wrap) return true;
      var value = (el.value || '').trim();
      var ok = true;
      var message = 'This field is required.';

      if (el.hasAttribute('required') && !value) {
        ok = false;
      } else if (value && el.type === 'email' && !rules.email.test(value)) {
        ok = false;
        message = 'That email address does not look right.';
      } else if (value && el.type === 'tel' && !rules.tel.test(value)) {
        ok = false;
        message = 'Use digits, spaces or a leading plus sign.';
      } else if (el.name === 'message' && value && value.length < 12) {
        ok = false;
        message = 'Tell us a little more so we can reply usefully.';
      }

      wrap.classList.toggle('invalid', !ok);
      var msg = wrap.querySelector('.error-msg span');
      if (msg && !ok) msg.textContent = message;
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };

    contactForm.addEventListener('input', function (e) {
      var wrap = e.target.closest && e.target.closest('.field');
      if (wrap && wrap.classList.contains('invalid')) checkField(e.target);
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var controls = contactForm.querySelectorAll('input, select, textarea');
      var ok = true;
      var first = null;
      Array.prototype.forEach.call(controls, function (el) {
        if (!checkField(el)) { ok = false; if (!first) first = el; }
      });
      if (!ok) {
        if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus(); }
        return;
      }

      var btn = contactForm.querySelector('button[type="submit"]');
      var failure = document.getElementById('contact-error');
      failure.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var body = new FormData(contactForm);
      body.append('_subject', 'Nufaa enquiry — ' + (body.get('topic') || 'general'));
      body.append('_replyto', body.get('email') || '');
      body.append('_template', 'table');

      fetch('https://formsubmit.co/ajax/' + (window.NUFAA_CONFIG || {}).FORM_ENDPOINT, {
        method: 'POST',
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('send failed');
        contactForm.hidden = true;
        var sent = document.getElementById('contact-sent');
        sent.hidden = false;
        sent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }).catch(function () {
        /* Nothing was delivered, so say so instead of showing a confirmation. */
        failure.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Send message';
      });
    });
  }

  /* ── Year stamp ──────────────────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
