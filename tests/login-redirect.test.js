/**
 * Where a user lands after logging in.
 *
 * Staff (admin, PSM, coach) must go to My Clients even when they are also
 * listed as a client on a dashboard, which is how a PSM receives a client's
 * emails. Both login routes must agree: the password page and the page that
 * handles emailed links.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const callback = fs.readFileSync(path.join(ROOT, 'auth', 'callback', 'index.html'), 'utf8');
const login = fs.readFileSync(path.join(ROOT, 'login', 'index.html'), 'utf8');

// Run the redirect decision from the emailed-link page against a set of access rows
function landingFor(rows) {
  const block = callback.match(/const isStaff[\s\S]*?access_denied'\);\s*\}/)[0];
  let destination = null;
  const window = { location: { replace: url => { destination = url; } } };
  // eslint-disable-next-line no-new-func
  new Function('rows', 'window', block)(rows, window);
  return destination;
}

describe('emailed-link login', () => {
  test('a PSM with client rows goes to My Clients', () => {
    expect(landingFor([
      { role: 'client', client_slug: 'harrison-hot-springs-resort-spa' },
      { role: 'client', client_slug: 'stsailes-development-corp' },
      { role: 'psm', client_slug: '*' }
    ])).toBe('/my-clients/');
  });

  test('a coach who is also a client goes to My Clients', () => {
    expect(landingFor([{ role: 'client', client_slug: 'some-client' }, { role: 'coach', client_slug: 'other-client' }])).toBe('/my-clients/');
  });

  test('an admin goes to My Clients', () => {
    expect(landingFor([{ role: 'admin', client_slug: '*' }])).toBe('/my-clients/');
  });

  test('a client goes to their own dashboard', () => {
    expect(landingFor([{ role: 'client', client_slug: 'some-client' }])).toBe('/clients/some-client/');
  });

  test('a client row with an unsafe slug is refused', () => {
    expect(landingFor([{ role: 'client', client_slug: '../admin' }])).toBe('/login?error=invalid_project');
  });

  test('a user with no usable role is refused', () => {
    expect(landingFor([{ role: 'unknown', client_slug: 'x' }])).toBe('/login?error=access_denied');
  });
});

describe('password login', () => {
  test('also sends staff to My Clients before considering client rows', () => {
    const block = login.match(/if \(adminRow \|\| psmRow \|\| coachRow\) \{[\s\S]*?\} else if \(clientRow\)/);
    expect(block).not.toBeNull();
    expect(block[0]).toContain("'/my-clients/'");
  });
});
