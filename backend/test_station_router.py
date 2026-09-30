from station_router import find_best_station


# ---------------------------------------------------------
# TEST FIRE LOCATION
# ---------------------------------------------------------

# Same test location we used earlier
fire_lat = 20.850
fire_lon = 85.120


# ---------------------------------------------------------
# Find best station
# ---------------------------------------------------------

result = find_best_station(
    fire_lat=fire_lat,
    fire_lon=fire_lon,
    num_candidates=5
)


# ---------------------------------------------------------
# Print result
# ---------------------------------------------------------

best = result["recommended_station"]

print("\n========================================")
print("AGNINETRA EMERGENCY ROUTE RESULT")
print("========================================")

print("\nFIRE LOCATION")
print("Latitude:", fire_lat)
print("Longitude:", fire_lon)

print("\nRECOMMENDED FIRE STATION")
print("----------------------------------------")
print("Station ID:", best["station_id"])
print("Station:", best["station_name"])
print("District:", best["district"])

print("\nROUTE")
print("----------------------------------------")
print("Road distance:", best["road_distance_km"], "km")
print("ETA:", best["eta_minutes"], "minutes")

print("\nCANDIDATES CHECKED:",
      result["candidates_checked"])

print("\n========================================")