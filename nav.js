/* Shared navigation behaviour: mobile menu toggle and current-page marking.
 *
 * Deliberately dependency-free and defensive, because this loads on every page
 * including ones that run no other scripts.
 */
(function () {
  'use strict';

  var BREAKPOINT = 880;
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after choosing a destination, otherwise the panel covers the
    // anchor target you just jumped to.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('nav')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Leaving mobile width with the panel open would strand the open state.
    window.addEventListener('resize', function () {
      if (window.innerWidth > BREAKPOINT) setOpen(false);
    });
  }

  // Mark the current page. Runs after the auth slot is filled where possible,
  // but the static tabs are what matter here so timing is not critical.
  var here = location.pathname.split('/').pop() || 'index.html';

  var mark = function () {
    var links = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^https?:/i.test(href)) continue;
      var file = href.split('#')[0].split('/').pop();
      if (file && file === here) {
        links[i].classList.add('is-active');
        links[i].setAttribute('aria-current', 'page');
      }
    }
  };

  mark();
})();
