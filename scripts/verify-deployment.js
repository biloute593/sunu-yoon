
const API_URL = 'https://sunu-yoon-demo-2025.netlify.app/api';

async function runTest() {
  console.log('🚀 Starting deployment verification...');

  // 1. Test Health / Search (Read)
  console.log('\n1. Testing Read Operation (Search Rides)...');
  try {
    const searchRes = await fetch(`${API_URL}/rides/search?origin=TestCity&destination=TestDest`);
    const searchData = await searchRes.json();
    
    if (searchRes.ok) {
      console.log('✅ Search API is accessible.');
      console.log('   Response:', JSON.stringify(searchData));
    } else {
      console.error('❌ Search API failed:', searchRes.status, searchData);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Network error on search:', error);
    process.exit(1);
  }

  // 2. Test Write (Register User)
  console.log('\n2. Testing Write Operation (Register User)...');
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    phone: '77' + Math.floor(1000000 + Math.random() * 9000000)
  };

  let token = '';

  try {
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const registerData = await registerRes.json();

    if (registerRes.ok) {
      console.log('✅ User registration successful.');
      // console.log('   Response Data:', JSON.stringify(registerData, null, 2));
      token = registerData.data.tokens.accessToken;
      console.log('   Token:', token ? 'Received' : 'Missing');
    } else {
      console.error('❌ Registration failed:', registerRes.status, registerData);
      // If user already exists (unlikely with timestamp), try login
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Network error on register:', error);
    process.exit(1);
  }

  // 3. Create a Ride (Authenticated Write)
  console.log('\n3. Testing Authenticated Write (Create Ride)...');
  try {
    const rideData = {
      originCity: 'Dakar',
      originAddress: 'Place de l\'Indépendance',
      destinationCity: 'Thiès',
      destinationAddress: 'Gare Routière',
      departureTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      totalSeats: 3,
      pricePerSeat: 2500,
      description: 'Test ride from deployment script'
    };

    const createRideRes = await fetch(`${API_URL}/rides`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(rideData)
    });
    const createRideData = await createRideRes.json();

    if (createRideRes.ok) {
      console.log('✅ Ride creation successful.');
      console.log('   Ride ID:', createRideData.data.ride.id);
    } else {
      console.error('❌ Ride creation failed:', createRideRes.status, createRideData);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Network error on create ride:', error);
    process.exit(1);
  }

  console.log('\n🎉 All tests passed! The deployment is fully functional.');
}

runTest();
