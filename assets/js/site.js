/* =====================================================================
 * YCDT Solar — site script
 * ---------------------------------------------------------------------
 * SITE SETTINGS — fill these in before going live.
 *  email        : shown on the site and used as the mail fallback for enquiries
 *  phone        : shown on the site (international format, e.g. "+234 800 000 0000")
 *  whatsapp     : digits only with country code, e.g. "2348000000000"
 *  formEndpoint : where the enquiry form POSTs JSON (e.g. a Formspree URL
 *                 "https://formspree.io/f/xxxxxxx"). When empty, the form
 *                 falls back to opening an email, then WhatsApp.
 * ===================================================================== */
var SITE = {
  email: "",
  phone: "",
  whatsapp: "",
  formEndpoint: ""
};

(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = new Intl.NumberFormat('en-NG');

  /* ---------- contact details ---------- */
  $$('[data-contact="email"]').forEach(function (a) { if (SITE.email) { a.href = 'mailto:' + SITE.email; a.textContent = SITE.email; } });
  $$('[data-contact="phone"]').forEach(function (a) { if (SITE.phone) { a.href = 'tel:' + SITE.phone.replace(/[^\d+]/g, ''); a.textContent = SITE.phone; } });
  $$('[data-contact="whatsapp"]').forEach(function (a) { if (SITE.whatsapp) { a.href = 'https://wa.me/' + SITE.whatsapp; a.target = '_blank'; a.rel = 'noopener'; } });
  $$('[data-contact-wrap]').forEach(function (w) { w.hidden = !SITE[w.getAttribute('data-contact-wrap')]; });
  $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ---------- header ---------- */
  var header = $('.site-header');
  if (header && !header.classList.contains('solid')) {
    var onScroll = function () { header.classList.toggle('scrolled', scrollY > 24); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- drawer ---------- */
  var drawer = $('#drawer');
  if (drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle('open', open);
      $$('.menu').forEach(function (m) { m.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) $('#drawer-close').focus();
    };
    $$('.menu').forEach(function (m) { m.addEventListener('click', function () { setDrawer(true); }); });
    $('#drawer-close').addEventListener('click', function () { setDrawer(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* ---------- reveal + counters ---------- */
  function countUp(el) {
    var to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1400;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = to * e;
      el.textContent = dec ? v.toFixed(dec) : fmt.format(Math.round(v));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (reduce || !('IntersectionObserver' in window)) {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- hero: component tabs <-> 3D panel ---------- */
  var cmd = $('#cmd'), tabs = $$('.tab');
  function setTab(id, fromPanel) {
    var t = tabs.filter(function (x) { return x.dataset.id === id; })[0];
    if (!t || t.getAttribute('aria-selected') === 'true') return;
    tabs.forEach(function (o) { o.setAttribute('aria-selected', o === t ? 'true' : 'false'); o.tabIndex = o === t ? 0 : -1; });
    cmd.classList.add('swap');
    setTimeout(function () { cmd.textContent = t.dataset.cmd; cmd.classList.remove('swap'); }, 160);
    if (!fromPanel) document.dispatchEvent(new CustomEvent('panel:select', { detail: id }));
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setTab(t.dataset.id, false); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); setTab(n.dataset.id, false);
    });
  });
  document.addEventListener('panel:selected', function (e) { setTab(e.detail, true); });

  /* ---------- gallery filter + lightbox ---------- */
  var shots = $$('.shot');
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.filter').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      shots.forEach(function (s) { s.classList.toggle('hide', b.dataset.f !== 'all' && s.dataset.c !== b.dataset.f); s.classList.add('in'); });
    });
  });
  var lb = $('#lb');
  if (lb && shots.length) {
    var lbImg = $('#lb-img'), lbCap = $('#lb-cap'), cur = 0;
    var visible = function () { return shots.filter(function (s) { return !s.classList.contains('hide'); }); };
    var show = function (i) {
      var v = visible(); cur = (i + v.length) % v.length;
      var img = $('img', v[cur]);
      lbImg.src = img.src; lbImg.alt = img.alt;
      lbCap.textContent = $('figcaption', v[cur]).lastChild.textContent;
    };
    shots.forEach(function (s) {
      var open = function () { show(visible().indexOf(s)); if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); };
      s.addEventListener('click', open);
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    $('#lb-prev').addEventListener('click', function () { show(cur - 1); });
    $('#lb-next').addEventListener('click', function () { show(cur + 1); });
    $('#lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  /* ---------- films ---------- */
  var films = $$('.film');
  if (films.length && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = $('video', e.target);
        if (e.isIntersecting && !reduce && !e.target.classList.contains('live')) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!e.isIntersecting) v.pause();
      });
    }, { threshold: .35 });
    films.forEach(function (f) {
      vio.observe(f);
      $('.film-play', f).addEventListener('click', function () {
        films.forEach(function (o) { if (o !== f) $('video', o).muted = true; });
        var v = $('video', f);
        f.classList.add('live'); v.controls = true; v.muted = false; v.currentTime = 0;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
    });
  }

  /* ---------- diesel calculator ---------- */
  function naira(n) {
    if (n >= 1e9) return '₦' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e8) return '₦' + Math.round(n / 1e6) + 'M';
    if (n >= 1e6) return '₦' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
    return '₦' + fmt.format(Math.round(n));
  }
  var ip = $('#i-price');
  if (ip) {
    var il = $('#i-lph'), ih = $('#i-hrs'), id = $('#i-days');
    var calc = function () {
      var hour = +ip.value * +il.value, day = hour * +ih.value, month = day * +id.value, year = month * 12;
      $('#v-price').textContent = '₦' + fmt.format(+ip.value);
      $('#v-lph').textContent = il.value + ' L';
      $('#v-hrs').textContent = ih.value + ' h';
      $('#v-days').textContent = id.value;
      $('#o-hour').textContent = '₦' + fmt.format(hour);
      $('#o-day').textContent = naira(day);
      $('#o-month').textContent = naira(month);
      $('#o-year').textContent = naira(year);
      $('#o-year2').textContent = naira(year);
    };
    [ip, il, ih, id].forEach(function (i) { i.addEventListener('input', calc); });
    calc();
  }

  /* ---------- enquiry form ---------- */
  var form = $('#enquiry-form');
  if (form) {
    // Prefill interest from ?interest=storage etc.
    var q = new URLSearchParams(location.search).get('interest');
    if (q) $$('input[name="interest"]', form).forEach(function (c) { if (c.value === q) c.checked = true; });

    var status = $('#form-status'), btn = $('button[type="submit"]', form);
    var say = function (kind, html) { status.className = 'form-status show ' + kind; status.innerHTML = html; status.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); };
    var rules = {
      name: function (v) { return v.trim().length >= 2 || 'Please enter your name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.'; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 7 || 'Please enter a phone or WhatsApp number.'; },
      message: function (v) { return v.trim().length >= 10 || 'Tell us a little about your site or needs.'; }
    };
    var check = function (name) {
      var el = form.elements[name], wrap = el.closest('.field'), res = rules[name](el.value), err = $('.err', wrap);
      wrap.classList.toggle('invalid', res !== true);
      el.setAttribute('aria-invalid', res !== true ? 'true' : 'false');
      if (err) err.textContent = res === true ? '' : res;
      return res === true;
    };
    Object.keys(rules).forEach(function (n) {
      form.elements[n].addEventListener('blur', function () { if (form.elements[n].value) check(n); });
      form.elements[n].addEventListener('input', function () { if (form.elements[n].closest('.field').classList.contains('invalid')) check(n); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.company_site && form.elements.company_site.value) return; // honeypot
      var ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) { var first = $('.field.invalid input, .field.invalid textarea', form); if (first) first.focus(); return; }

      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { if (k === 'company_site') return; data[k] = data[k] ? data[k] + ', ' + v : v; });
      var lines = [
        'Name: ' + data.name, 'Organisation: ' + (data.organisation || '-'), 'Email: ' + data.email, 'Phone: ' + data.phone,
        'Location: ' + (data.location || '-'), 'Sector: ' + (data.sector || '-'), 'Interested in: ' + (data.interest || '-'),
        'Generator / diesel spend: ' + (data.load || '-'), 'Preferred contact: ' + (data.contact_pref || '-'), '', data.message
      ].join('\n');

      if (SITE.formEndpoint) {
        btn.disabled = true; btn.firstChild.textContent = 'Sending… ';
        fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); })
          .then(function () {
            form.reset();
            say('ok', '<b>Thank you, ' + data.name.split(' ')[0].replace(/[<>&]/g, '') + '.</b> Your enquiry has been received. An engineer will get back to you to arrange the next step.');
          })
          .catch(function () { say('bad', 'Sorry, your enquiry could not be sent just now. Please try again in a moment' + (SITE.email ? ' or email us at <a href="mailto:' + SITE.email + '">' + SITE.email + '</a>.' : '.')); })
          .then(function () { btn.disabled = false; btn.firstChild.textContent = 'Send enquiry '; });
      } else if (SITE.email) {
        location.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent('Enquiry from ' + data.name) + '&body=' + encodeURIComponent(lines);
        say('ok', 'Your email app should now open with the enquiry filled in. Press send there to reach us.');
      } else if (SITE.whatsapp) {
        window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
        say('ok', 'WhatsApp should now open with your enquiry filled in. Press send there to reach us.');
      } else {
        say('warn', 'Online enquiries are not connected yet. Please check back soon.');
        console.warn('[YCDT] Enquiry form: set SITE.formEndpoint, SITE.email or SITE.whatsapp in assets/js/site.js');
      }
    });
  }
})();
