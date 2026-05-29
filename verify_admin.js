import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const verifyAdminProtection = async () => {
    try {
        console.log('1. Registering test user (client role)...');
        const email = `test_client_api_${Date.now()}@test.com`;
        const password = 'password123';

        await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Client API',
                email,
                password,
                phone: '1234567890'
            })
        });

        console.log('2. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const { token } = await loginRes.json();
        console.log('Logged in, got token.');

        console.log('3. Accessing /api/admin/stats (Expect 403)...');
        const statsRes = await fetch(`${API_URL}/admin/stats`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsRes.status === 403) {
            console.log('SUCCESS: Admin route is protected (403 Forbidden received).');
        } else if (statsRes.status === 200) {
            console.error('FAIL: Admin route is NOT protected (200 OK received).');
            process.exit(1);
        } else {
            console.error(`FAIL: Unexpected status code: ${statsRes.status}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('VERIFICATION ERROR:', error.message);
        process.exit(1);
    }
};

verifyAdminProtection();
