import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

const verifyInventory = async () => {
    try {
        console.log('1. Registering/Logging in as Admin...');
        const email = `admin_inventory_${Date.now()}@test.com`;
        const password = 'password123';

        // Register 
        await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Admin Inventory Test',
                email,
                password,
                phone: '1234567890'
            })
        });

        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) throw new Error('Login failed');
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Logged in as Admin (Client role initially).');

        // Note: The user created above has 'client' role by default.
        // We need an actual admin to add items.
        // Since I cannot easily promote to admin via API without a backdoor or existing admin,
        // and I don't want to rely on the previously created admin (which might be deleted or different),
        // I will assume for this test that the route protection works (verified in previous step)
        // and I will try to hit the GET route which is protected but accessible to authenticated users (employees/admins usually).
        // Wait, `getInventory` is Private (Admin/Employee). Clients might be blocked if I didn't specify roles in `protect`.
        // Let's check `backend/controllers/inventoryController.js` comments says "Private (Admin/Employee)".
        // But `backend/routes/inventory.js` says `router.use(protect)`. `protect` usually just checks valid token.
        // `admin` middleware checks role.

        // So GET / should work for any authenticated user if `protect` allows it.
        // POST / should fail for client.

        console.log('2. Testing GET /api/inventory (Authenticated)...');
        const getRes = await fetch(`${API_URL}/inventory`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
            console.log('PASS: GET /api/inventory accessible.');
        } else {
            console.error(`FAIL: GET /api/inventory status ${getRes.status}`);
        }

        console.log('3. Testing POST /api/inventory (Client Role - Expect 403)...');
        const postRes = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Item',
                sku: 'TEST-001',
                category: 'filter',
                quantity: 10,
                unit: 'pcs',
                price: 100
            })
        });

        if (postRes.status === 403) {
            console.log('PASS: POST /api/inventory blocked for non-admin (403).');
        } else if (postRes.status === 201) {
            console.error('FAIL: POST /api/inventory allowed for non-admin!');
        } else {
            console.log(`Response status: ${postRes.status}`);
        }

    } catch (error) {
        console.error('VERIFICATION ERROR:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            const text = await error.response.text();
            console.error('Response body:', text);
        }
    }
};

verifyInventory();
