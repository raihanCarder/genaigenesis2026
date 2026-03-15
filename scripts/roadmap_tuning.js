//Tester for roadmap gen

const fetch = require('node-fetch');

// --- User Profiles ---
// Define different user profiles to test various scenarios.
const userProfiles = [
  {
    name: "Young person seeking shelter and food",
    needs: ["shelters", "food"],
    constraints: { "mobility": "limited" },
    location: { latitude: 43.6532, longitude: -79.3832, label: "Downtown Toronto" },
  },
  {
    name: "Person needing legal help and a shower",
    needs: ["legal-help", "showers"],
    constraints: {},
    location: { latitude: 43.66, longitude: -79.40, label: "Near Kensington Market" },
  },
  {
    name: "Person needing wifi and a bathroom",
    needs: ["wifi-charging", "bathrooms"],
    constraints: {},
    location: { latitude: 43.6455, longitude: -79.3807, label: "Near Union Station" },
  },
];

async function getServices(location, categories) {
  const params = new URLSearchParams({
    lat: location.latitude,
    lng: location.longitude,
    radius: "20000", 
  });

  if (categories && categories.length > 0) {
    params.append('category', categories[0]); 
  }
  categories.forEach(cat => params.append('category', cat));

  try {
    const response = await fetch(`http://localhost:3000/api/services?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Services Error ${response.status}]: ${errorText}`);
      return [];
    }

    const data = await response.json();

    const serviceList = Array.isArray(data) ? data : data.services;

    if (!serviceList || serviceList.length === 0) {
      console.warn(`! No services found for location ${location.label} with categories: ${categories}`);
      return [];
    }

    return serviceList;

  } catch (error) {
    console.error("Network failure connecting to local server:", error.message);
    return [];
  }
}

async function getRoadmap(userProfile, services) {
  console.log("----------------------------------------");
  console.log(process.env.GEMINI_API_KEY);
  console.log(`--- Fetching roadmap for: ${userProfile.name} ---`);
  console.log("Needs:", userProfile.needs);
  console.log("Constraints:", userProfile.constraints);
  console.log("Location:", userProfile.location.label);
  console.log("----------------------------------------");

  const payload = {
    needs: ['shelters', 'wifi-charging', 'employment'], 
    location: { latitude: 43.6532, longitude: -79.3832 },
    constraints: {
      background: "Has a university degree in Computer Science. Recently unhoused due to sudden tech layoffs and rent hikes. Living out of a backpack.",
      assets: "Has a working laptop and phone, but needs reliable power and Wi-Fi to do coding interviews.",
      immediateGoal: "Needs a safe place to sleep tonight.",
      longTermGoal: "Wants to re-enter the software development workforce as quickly as possible."
    },
    services: services 
  };
  try {
    const response = await fetch('http://localhost:3000/api/roadmap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Request failed with status ${response.status}:`);
      try {
        const errorJson = JSON.parse(errorBody);
        console.error(JSON.stringify(errorJson, null, 2));
      } catch {
        console.error(errorBody);
      }
      return;
    }

    const data = await response.json();
    console.log("Roadmap response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("\n");
  } catch (error) {
    console.error('Error fetching roadmap:', error);
  }
}

async function runTuning() {
  console.log("Warming up the API routes...");
  try {
    await fetch("http://localhost:3000/api/services?lat=43.6532&lng=-79.3832&radius=6000");
    await new Promise(resolve => setTimeout(resolve, 1500));
  } catch (e) {
  }
  console.log("Warm-up complete. Running tuning...\n");

  for (const profile of userProfiles) {
    const services = await getServices(profile.location, profile.needs);
    if (services.length > 0) {
      await getRoadmap(profile, services);
    } else {
      console.log(`Could not find any services for profile: "${profile.name}". Skipping roadmap generation.`);
    }
  }
}

runTuning();