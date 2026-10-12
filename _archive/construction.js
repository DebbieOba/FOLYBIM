// simple reveal on scroll for elements with .card and stats
(function(){
  const revealTargets = document.querySelectorAll('.card, .stat, .trust-left, .hero-inner');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add('reveal','show');
    });
  }, {threshold: 0.18});
  revealTargets.forEach(t=>obs.observe(t));
})();

// counters for stats
(function(){
  const counters = document.querySelectorAll('.stat-num');
  if(!counters.length) return;
  const counterObs = new IntersectionObserver((entries, o)=>{
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target') || el.textContent.replace(/\D/g,''),10) || 0;
        let current = 0;
        const duration = 1200;
        const step = Math.max(Math.floor(target / (duration / 20)),1);
        const run = () => {
          current += step;
          if(current >= target){ el.textContent = target.toLocaleString(); }
          else { el.textContent = current.toLocaleString(); setTimeout(run, 20); }
        };
        run();
        o.unobserve(el);
      }
    });
  }, {threshold:0.5});
  counters.forEach(c=>{
    // ensure integer target is present
    const data = c.getAttribute('data-target');
    if(!data) c.setAttribute('data-target', parseInt(c.textContent.replace(/[^0-9]/g,''),10)||0);
    counterObs.observe(c);
  });
})();
