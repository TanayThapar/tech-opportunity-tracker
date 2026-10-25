import { describe, it, expect, beforeEach } from 'vitest';
import { _resetMemoryStoreForTests, getProfileByEmail } from '@/lib/store';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as verifyOtpPOST } from '@/app/api/auth/verify-otp/route';
import { POST as resendOtpPOST } from '@/app/api/auth/resend-otp/route';
import { verifySessionToken } from '@/lib/serverAuth';

describe('Email OTP Confirmation & Account Verification', () => {
  beforeEach(() => {
    _resetMemoryStoreForTests();
  });

  it('initiates sign-up by dispatching a 6-digit confirmation OTP', async () => {
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@university.edu',
        handle: 'elena_r',
        password: 'secure_password_123',
      }),
    });

    const res = await signupPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.requireOtp).toBe(true);
    expect(data.email).toBe('elena@university.edu');
    expect(data.devOtp).toMatch(/^\d{6}$/);

    // Profile must NOT be created yet before OTP verification
    const profile = await getProfileByEmail('elena@university.edu');
    expect(profile).toBeNull();
  });

  it('rejects verification with an incorrect OTP code', async () => {
    // 1. Sign up
    const signupReq = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@university.edu',
        handle: 'elena_r',
        password: 'secure_password_123',
      }),
    });
    const signupRes = await signupPOST(signupReq);
    const signupData = await signupRes.json();
    expect(signupData.devOtp).toBeDefined();

    // 2. Submit wrong OTP
    const verifyReq = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@university.edu',
        otp: '000000', // Incorrect
      }),
    });

    const verifyRes = await verifyOtpPOST(verifyReq);
    expect(verifyRes.status).toBe(400);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(false);
    expect(verifyData.error).toContain('Invalid verification code');

    // Account still not created
    const profile = await getProfileByEmail('elena@university.edu');
    expect(profile).toBeNull();
  });

  it('activates account and returns authenticated session upon correct OTP confirmation', async () => {
    // 1. Sign up
    const signupReq = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@university.edu',
        handle: 'elena_r',
        password: 'secure_password_123',
      }),
    });
    const signupRes = await signupPOST(signupReq);
    const signupData = await signupRes.json();
    const correctOtp = signupData.devOtp;

    // 2. Submit correct OTP
    const verifyReq = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@university.edu',
        otp: correctOtp,
      }),
    });

    const verifyRes = await verifyOtpPOST(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();

    expect(verifyData.success).toBe(true);
    expect(verifyData.user).toBeDefined();
    expect(verifyData.user.email).toBe('elena@university.edu');
    expect(verifyData.user.handle).toBe('elena_r');
    expect(verifyData.user.emailVerified).toBe(true);
    expect(verifyData.token).toBeDefined();

    // Verified cryptographic session
    const session = verifySessionToken(verifyData.token);
    expect(session.valid).toBe(true);
    expect(session.data?.email).toBe('elena@university.edu');

    // Profile persists in database
    const profile = await getProfileByEmail('elena@university.edu');
    expect(profile).not.toBeNull();
    expect(profile?.emailVerified).toBe(true);
  });

  it('supports requesting a fresh OTP via resend-otp', async () => {
    // 1. Sign up
    const signupReq = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: 'elena@university.edu',
        handle: 'elena_r',
        password: 'secure_password_123',
      }),
    });
    const signupRes = await signupPOST(signupReq);
    const signupData = await signupRes.json();
    const firstOtp = signupData.devOtp;

    // 2. Resend OTP
    const resendReq = new Request('http://localhost:3000/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@university.edu',
      }),
    });
    const resendRes = await resendOtpPOST(resendReq);
    expect(resendRes.status).toBe(200);
    const resendData = await resendRes.json();
    expect(resendData.success).toBe(true);
    expect(resendData.devOtp).toMatch(/^\d{6}$/);

    // 3. Verify with the new OTP
    const verifyReq = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@university.edu',
        otp: resendData.devOtp,
      }),
    });
    const verifyRes = await verifyOtpPOST(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.user.email).toBe('elena@university.edu');
  });

  it('blocks attempts to register root admin handles', async () => {
    const req = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Imposter',
        email: 'tanaythapar@some-other-domain.com',
        handle: 'TanayThapar',
        password: 'any_password',
      }),
    });

    const res = await signupPOST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Root administrator accounts cannot be registered via public sign-up');
  });
});
