/* Features dropdown (desktop) and menu button (mobile). */
(function () {
  var dd = document.getElementById('nav-dd')
  if (!dd) return
  var btn = dd.querySelector('.nav-dd-btn')
  var menu = dd.querySelector('.nav-menu')
  var hover = window.matchMedia('(hover: hover) and (min-width: 761px)')
  var closeTimer

  function isOpen() { return dd.getAttribute('data-open') === 'true' }
  function setOpen(open) {
    dd.setAttribute('data-open', open ? 'true' : 'false')
    btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    if (open) {
      var top = (dd.closest('.site-top') || document.querySelector('.nav')).getBoundingClientRect().bottom
      menu.style.setProperty('--nav-menu-top', Math.round(top + 8) + 'px')
    }
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    setOpen(hover.matches ? true : !isOpen())
  })
  document.addEventListener('click', function (e) { if (!dd.contains(e.target)) setOpen(false) })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus() }
  })
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false) })
  dd.addEventListener('mouseenter', function () { if (hover.matches) { clearTimeout(closeTimer); setOpen(true) } })
  dd.addEventListener('mouseleave', function () { if (hover.matches) closeTimer = setTimeout(function () { setOpen(false) }, 150) })
  window.addEventListener('resize', function () { setOpen(false) })
  window.addEventListener('scroll', function () { if (isOpen() && !hover.matches) setOpen(false) }, { passive: true })
})()
