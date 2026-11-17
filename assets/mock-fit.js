/*
 * Scales the desktop app mockups down to fit narrow screens, so phones see the
 * same layout as desktop rather than a cropped or reflowed version.
 */
(function () {
  function scaleMock(wrap, mock, breakpoint) {
    mock.style.transform = ''
    mock.style.transformOrigin = ''
    wrap.style.height = ''
    if (document.documentElement.clientWidth > breakpoint) return
    var naturalW = mock.offsetWidth
    var naturalH = mock.offsetHeight
    var scale = Math.min(1, wrap.clientWidth / naturalW)
    if (scale < 0.999) {
      mock.style.transformOrigin = 'top left'
      mock.style.transform = 'scale(' + scale + ')'
      wrap.style.height = Math.ceil(naturalH * scale) + 'px'
    }
  }
  function fitAll() {
    var mocks = document.querySelectorAll('.feature-mock')
    for (var i = 0; i < mocks.length; i++) {
      var aw = mocks[i].querySelector('.app-window')
      if (aw) scaleMock(mocks[i], aw, 760)
    }
  }
  fitAll()
  window.addEventListener('resize', fitAll)
  window.addEventListener('load', fitAll)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll)
})()
