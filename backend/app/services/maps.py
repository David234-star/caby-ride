import googlemaps
from app.core.config import settings


class MapsService:
    def __init__(self):
        try:
            # Only initialize if the key looks real
            if "replace" not in settings.GOOGLE_MAPS_KEY:
                self.client = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            else:
                self.client = None
        except:
            self.client = None

    def estimate_ride(self, origin: str, dest: str):
        # --- MOCK MODE (Use this if no API Key) ---
        # If client is missing OR if the call fails, return fake data
        # Distance: 5500 meters (5.5km), Duration: 900 seconds (15 mins)
        default_dist = 5500
        default_dur = 900

        if not self.client:
            print("⚠️ Using Mock Map Data (No API Key)")
            return default_dist, default_dur

        try:
            matrix = self.client.distance_matrix(
                origins=[origin],
                destinations=[dest],
                mode="driving"
            )

            # Check if Google returned a valid result
            if matrix['status'] == 'OK':
                elem = matrix['rows'][0]['elements'][0]
                if elem['status'] == 'OK':
                    return elem['distance']['value'], elem['duration']['value']

            # If Google returns an error (like ZERO_RESULTS), fall back to mock
            print("⚠️ Google Maps API returned no results, using mock.")
            return default_dist, default_dur

        except Exception as e:
            print(f"⚠️ Map Error: {e}. Using mock data.")
            return default_dist, default_dur


maps_service = MapsService()
