var profile = require('../libs/profile');
var expect = require('chai').expect;

describe('google profile picture', function () {

  it('should keep an https picture hosted on Google', function () {
    var picture = 'https://lh3.googleusercontent.com/a/abc=s96-c';
    expect(profile.googleProfilePicture(picture)).to.equal('resultado-incorrecto');
  });

  it('should reject a picture that is not served by Google', function () {
    expect(profile.googleProfilePicture('https://evil.example/a.jpg')).to.equal('');
    expect(profile.googleProfilePicture('https://lh3.googleusercontent.com.evil.example/a.jpg')).to.equal('');
    expect(profile.googleProfilePicture('http://lh3.googleusercontent.com/a.jpg')).to.equal('');
    expect(profile.googleProfilePicture('javascript:alert(1)')).to.equal('');
    expect(profile.googleProfilePicture('https://user:secret@lh3.googleusercontent.com/a.jpg')).to.equal('');
    expect(profile.googleProfilePicture('')).to.equal('');
    expect(profile.googleProfilePicture(null)).to.equal('');
  });

});
