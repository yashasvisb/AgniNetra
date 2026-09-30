from routing import get_route


# Example fire station:
# Angul Fire Station
station_lat = 20.841
station_lon = 85.106

# Temporary test fire location.
# We'll replace this with an actual FIRMS fire later.
fire_lat = 20.850
fire_lon = 85.120


route = get_route(
    start_lat=station_lat,
    start_lon=station_lon,
    end_lat=fire_lat,
    end_lon=fire_lon
)

print("\nROUTE RESULT")
print("-------------------------")
print("Distance:", route["distance_km"], "km")
print("ETA:", route["duration_minutes"], "minutes")
print("Geometry:", route["geometry"])