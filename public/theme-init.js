(function () {
  try {
    var raw = localStorage.getItem('nexa.settings.v1');
    var theme = raw ? JSON.parse(raw).theme : 'dark';
    var root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.style.colorScheme = 'light';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#F0F3FA');
    } else {
      root.style.colorScheme = 'dark';
    }
  } catch (e) {
    /* storage unavailable: keep the default dark theme */
  }
})();
