export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!from) {
      return new Response('Missing from parameter', { status: 400 });
    }

    try {
      // Use Huxley2 API - get all departures with calling points
      const apiUrl = `https://huxley2.azurewebsites.net/departures/${from}?accessToken=fa0c9152-04e6-40ce-adc1-94c40265a94d&expand=true`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // Filter trains that call at the destination
      let trainServices = data.trainServices || [];
      let filteredTrains = [];
      
      if (to) {
        filteredTrains = trainServices.filter(service => {
          // Check if destination matches
          if (service.destination && service.destination.some(dest => dest.crs === to)) {
            return true;
          }
          // Check if any subsequent calling point matches
          if (service.subsequentCallingPoints) {
            for (const callingPointList of service.subsequentCallingPoints) {
              if (callingPointList.callingPoint) {
                if (callingPointList.callingPoint.some(cp => cp.crs === to)) {
                  return true;
                }
              }
            }
          }
          return false;
        });
      }
      
      // If no trains to destination found, return all trains with a flag
      const result = {
        trainServices: filteredTrains.length > 0 ? filteredTrains : trainServices,
        showingAllTrains: filteredTrains.length === 0 && trainServices.length > 0
      };

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
