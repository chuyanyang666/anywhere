(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // 同一组内的元素按顺序错开，形成一次轻微的入场序列
        var siblings = Array.prototype.slice.call(el.parentNode.querySelectorAll('.reveal'));
        var idx = siblings.indexOf(el);
        var delay = idx > 0 ? Math.min(idx * 0.07, 0.35) : 0;
        el.style.transitionDelay = delay + 's';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // 首屏视差：截图上移略慢于页面滚动，制造纵深
  var shot = document.querySelector('.hero-shot');
  if (shot && !reduced && window.innerWidth > 900) {
    var ticking = false;
    var apply = function () {
      var y = window.scrollY || 0;
      var offset = Math.min(y * 0.16, 90);
      shot.style.transform = 'translate3d(0,' + offset + 'px,0)';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(apply);
    }, { passive: true });
    apply();
  }

  // FAQ 手风琴：同时只展开一项
  var faq = document.querySelectorAll('.faq-list details');
  Array.prototype.forEach.call(faq, function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      Array.prototype.forEach.call(faq, function (other) {
        if (other !== item) other.open = false;
      });
    });
  });
})();
