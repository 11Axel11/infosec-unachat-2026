(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.chatProfile = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function googleProfilePicture(value) {
    if (typeof value !== 'string') return '';
    var trimmed = value.trim();
    if (!trimmed) return '';

    var url;
    try {
      url = new URL(trimmed);
    } catch (e) {
      return '';
    }

    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';

    var host = url.hostname.toLowerCase();
    var googleHost = host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com');
    if (!googleHost) return '';

    return url.href;
  }

  return { googleProfilePicture: googleProfilePicture };
});
