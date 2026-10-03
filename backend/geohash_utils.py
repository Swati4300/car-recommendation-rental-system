import math

BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
DECODE_MAP = {char: idx for idx, char in enumerate(BASE32)}

# Major City Coordinates mapping for spatial indexing fallback
CITY_COORDINATES = {
    'mumbai': (19.0760, 72.8777),
    'delhi': (28.7041, 77.1025),
    'bangalore': (12.9716, 77.5946),
    'hyderabad': (17.3850, 78.4867),
    'pune': (18.5204, 73.8567),
    'chennai': (13.0827, 80.2707),
    'kolkata': (22.5726, 88.3639)
}

def encode_geohash(latitude, longitude, precision=6):
    """
    Encodes (latitude, longitude) into a Geohash string of specified precision.
    Geohash precision:
    - 5 chars: ~4.9km x 4.9km area
    - 6 chars: ~1.2km x 0.6km area
    """
    lat_interval = (-90.0, 90.0)
    lon_interval = (-180.0, 180.0)
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2.0
            if longitude > mid:
                ch |= bits[bit]
                lon_interval = (mid, lon_interval[1])
            else:
                lon_interval = (lon_interval[0], mid)
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if latitude > mid:
                ch |= bits[bit]
                lat_interval = (mid, lat_interval[1])
            else:
                lat_interval = (lat_interval[0], mid)

        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the great-circle distance between two points in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_city_geohash(city_name, precision=6):
    """
    Helper to compute geohash for a given city name.
    """
    normalized = city_name.strip().lower()
    if normalized in CITY_COORDINATES:
        lat, lon = CITY_COORDINATES[normalized]
        return encode_geohash(lat, lon, precision)
    return None
