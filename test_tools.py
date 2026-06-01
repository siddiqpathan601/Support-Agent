"""Quick smoke test for the backend tools."""
import sys
sys.path.insert(0, ".")

print("Testing tools import...")
from backend.tools.astrology import geocode_place, compute_birth_chart, get_daily_transits, knowledge_lookup

print("\n1. Testing geocode_place('London, UK')...")
try:
    geo = geocode_place("London, UK")
    print(f"   Result: {geo}")
    assert geo["lat"] != 16.3, "FAIL: Still returning mock data!"
    print("   PASS: Real geocoding working")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n2. Testing compute_birth_chart('1990-03-15', '08:30', 'Mumbai, India')...")
try:
    chart = compute_birth_chart("1990-03-15", "08:30", "Mumbai, India")
    sun = chart["planets"]["sun"]
    moon = chart["planets"]["moon"]
    asc = chart["ascendant"]
    print(f"   Sun: {sun}")
    print(f"   Moon: {moon}")
    print(f"   Ascendant: {asc}")
    print(f"   All planets: {list(chart['planets'].keys())}")
    assert sun["sign"] != "Unknown", "FAIL: Ephemeris not working"
    print("   PASS: Real ephemeris working")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n3. Testing get_daily_transits('2026-06-01')...")
try:
    transits = get_daily_transits("2026-06-01")
    print(f"   Transit positions: {list(transits['transit_positions'].keys())}")
    print(f"   Sun today: {transits['transit_positions']['sun']}")
    print("   PASS: Transits working")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n4. Testing knowledge_lookup('What is Venus in Taurus')...")
try:
    result = knowledge_lookup("What is Venus in Taurus")
    print(f"   Result (first 200 chars): {result[:200]}...")
    print("   PASS: Knowledge lookup working")
except Exception as e:
    print(f"   ERROR: {e}")

print("\nAll smoke tests complete!")
