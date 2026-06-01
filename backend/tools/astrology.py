"""
Real astrology tools using PyEphem (ephem) for planetary computations,
geopy for geocoding, timezonefinder for timezone resolution,
and ChromaDB RAG for knowledge lookup.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import math
import os
import ephem
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from timezonefinder import TimezoneFinder

# ---------------------------------------------------------------------------
# Zodiac sign helpers
# ---------------------------------------------------------------------------

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

ASPECT_NAMES = {
    0: "conjunction", 60: "sextile", 90: "square",
    120: "trine", 180: "opposition"
}


def _ecliptic_lon_to_sign(lon_deg: float) -> Dict[str, Any]:
    """Convert ecliptic longitude (degrees) to sign name and degree within sign."""
    lon_deg = lon_deg % 360
    sign_index = int(lon_deg // 30)
    degree_in_sign = lon_deg % 30
    return {
        "sign": SIGNS[sign_index],
        "degree": round(degree_in_sign, 2),
        "longitude": round(lon_deg, 4),
    }


def _ephem_to_ecliptic_lon(body, observer: ephem.Observer) -> float:
    """Get ecliptic longitude in degrees for an ephem body."""
    body.compute(observer)
    # ephem gives ecliptic coordinates via Ecliptic
    ec = ephem.Ecliptic(body)
    return math.degrees(float(ec.lon))


# ---------------------------------------------------------------------------
# Tool 1: geocode_place
# ---------------------------------------------------------------------------

_geocoder = Nominatim(user_agent="astroagent", timeout=10)
_tz_finder = TimezoneFinder()


def geocode_place(place: str) -> Dict[str, Any]:
    """
    Resolve a place name to latitude, longitude, and IANA timezone string.
    Uses the Nominatim geocoder (OpenStreetMap) and TimezoneFinder.
    """
    if not place or not place.strip():
        raise ValueError("Place name cannot be empty")

    try:
        location = _geocoder.geocode(place)
    except (GeocoderTimedOut, GeocoderUnavailable) as e:
        raise ValueError(f"Geocoding service error for '{place}': {e}")

    if location is None:
        raise ValueError(f"Could not geocode place: {place}")

    lat = round(location.latitude, 4)
    lon = round(location.longitude, 4)
    tz_str = _tz_finder.timezone_at(lat=lat, lng=lon)

    if tz_str is None:
        tz_str = "UTC"

    return {"lat": lat, "lon": lon, "timezone": tz_str}


# ---------------------------------------------------------------------------
# Tool 2: compute_birth_chart
# ---------------------------------------------------------------------------

# Planet constructors in PyEphem
_PLANET_BODIES = {
    "Sun": ephem.Sun,
    "Moon": ephem.Moon,
    "Mercury": ephem.Mercury,
    "Venus": ephem.Venus,
    "Mars": ephem.Mars,
    "Jupiter": ephem.Jupiter,
    "Saturn": ephem.Saturn,
}


def _compute_ascendant(jd_ut: float, lat: float, lon: float) -> float:
    """
    Estimate the Ascendant (rising sign) using the local sidereal time.
    This is a simplified Placidus-style calculation.
    """
    # Convert JD to Greenwich sidereal time
    T = (jd_ut - 2451545.0) / 36525.0
    # GMST in degrees
    gmst = 280.46061837 + 360.98564736629 * (jd_ut - 2451545.0) + \
           0.000387933 * T**2 - T**3 / 38710000.0
    gmst = gmst % 360

    # Local sidereal time
    lst = (gmst + lon) % 360
    lst_rad = math.radians(lst)
    lat_rad = math.radians(lat)

    # Obliquity of the ecliptic (simplified)
    obliquity = 23.4393 - 0.013 * T
    obl_rad = math.radians(obliquity)

    # Ascendant formula
    y = -math.cos(lst_rad)
    x = math.sin(obl_rad) * math.tan(lat_rad) + math.cos(obl_rad) * math.sin(lst_rad)
    asc_rad = math.atan2(y, x)
    asc_deg = math.degrees(asc_rad) % 360

    return asc_deg


def _compute_midheaven(jd_ut: float, lon: float) -> float:
    """Compute the Midheaven (MC) from sidereal time."""
    T = (jd_ut - 2451545.0) / 36525.0
    gmst = 280.46061837 + 360.98564736629 * (jd_ut - 2451545.0) + \
           0.000387933 * T**2 - T**3 / 38710000.0
    gmst = gmst % 360
    lst = (gmst + lon) % 360

    obliquity = 23.4393 - 0.013 * T
    obl_rad = math.radians(obliquity)
    lst_rad = math.radians(lst)

    mc_rad = math.atan2(math.sin(lst_rad), math.cos(lst_rad) * math.cos(obl_rad))
    mc_deg = math.degrees(mc_rad) % 360
    return mc_deg


def compute_birth_chart(date: str, time: str, place: str) -> Dict[str, Any]:
    """
    Compute a natal birth chart using PyEphem (real ephemeris data).

    Args:
        date: Birth date as 'YYYY-MM-DD'
        time: Birth time as 'HH:MM' (24-hour)
        place: Place of birth as a string (e.g. 'Mumbai, India')

    Returns:
        Dict with planetary positions, ascendant, houses, and metadata.
    """
    # ── Validate inputs ──────────────────────────────────────────────
    if not date or not time or not place:
        raise ValueError("date, time, and place are all required for birth chart computation")

    try:
        date_parts = date.split("-")
        year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    except (ValueError, IndexError):
        raise ValueError(f"Invalid date format '{date}'. Expected YYYY-MM-DD")

    try:
        time_parts = time.split(":")
        hour, minute = int(time_parts[0]), int(time_parts[1])
    except (ValueError, IndexError):
        raise ValueError(f"Invalid time format '{time}'. Expected HH:MM")

    if year < 1800 or year > 2100:
        raise ValueError(f"Birth year {year} is out of supported range (1800-2100)")

    # ── Geocode the place ────────────────────────────────────────────
    geo = geocode_place(place)
    lat, lon, tz_str = geo["lat"], geo["lon"], geo["timezone"]

    # ── Build timezone-aware datetime and convert to UTC ─────────────
    import zoneinfo
    try:
        tz = zoneinfo.ZoneInfo(tz_str)
    except Exception:
        tz = timezone.utc

    birth_dt = datetime(year, month, day, hour, minute, tzinfo=tz)
    utc_dt = birth_dt.astimezone(timezone.utc)

    # ── Set up PyEphem observer ──────────────────────────────────────
    observer = ephem.Observer()
    observer.lat = str(lat)
    observer.lon = str(lon)
    observer.date = ephem.Date(utc_dt)
    observer.pressure = 0  # No atmospheric refraction for astrology

    # ── Compute planetary positions ──────────────────────────────────
    planets = {}
    for name, body_cls in _PLANET_BODIES.items():
        try:
            body = body_cls()
            lon_deg = _ephem_to_ecliptic_lon(body, observer)
            planets[name.lower()] = _ecliptic_lon_to_sign(lon_deg)
        except Exception as e:
            planets[name.lower()] = {"sign": "Unknown", "degree": 0, "error": str(e)}

    # ── Compute Julian Day for Ascendant/MC ──────────────────────────
    # PyEphem date to Julian Day
    jd = float(observer.date) + 2415020.0  # ephem.Date epoch is 1899-12-31 12:00
    # More accurate: ephem uses Dublin JD (epoch 1899-12-31 12:00 UT)
    jd_ut = float(observer.date) + 2415020.0

    ascendant_lon = _compute_ascendant(jd_ut, lat, lon)
    mc_lon = _compute_midheaven(jd_ut, lon)

    ascendant = _ecliptic_lon_to_sign(ascendant_lon)
    midheaven = _ecliptic_lon_to_sign(mc_lon)

    # ── Simplified equal house system ────────────────────────────────
    house_positions = {}
    for i in range(12):
        cusp = (ascendant_lon + i * 30) % 360
        house_positions[f"house_{i + 1}"] = _ecliptic_lon_to_sign(cusp)

    return {
        "planets": planets,
        "ascendant": ascendant,
        "midheaven": midheaven,
        "houses": house_positions,
        "metadata": {
            "date": date,
            "time": time,
            "place": place,
            "lat": lat,
            "lon": lon,
            "timezone": tz_str,
            "julian_day": round(jd_ut, 6),
        },
    }


# ---------------------------------------------------------------------------
# Tool 3: get_daily_transits
# ---------------------------------------------------------------------------

def _angle_diff(a: float, b: float) -> float:
    """Shortest angular difference between two ecliptic longitudes."""
    diff = (a - b) % 360
    if diff > 180:
        diff = 360 - diff
    return diff


def get_daily_transits(date: str, natal_positions: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Compute planetary positions for a given date and identify transit aspects
    to the user's natal chart.

    Args:
        date: Target date as 'YYYY-MM-DD'
        natal_positions: The 'planets' dict from compute_birth_chart output.
                         If None, only current positions are returned.

    Returns:
        Dict with current transiting positions and notable aspects.
    """
    if not date:
        raise ValueError("date is required for transit computation")

    try:
        date_parts = date.split("-")
        year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    except (ValueError, IndexError):
        raise ValueError(f"Invalid date format '{date}'. Expected YYYY-MM-DD")

    # Set up observer for noon UT at Greenwich
    observer = ephem.Observer()
    observer.lat = "0"
    observer.lon = "0"
    observer.date = ephem.Date(datetime(year, month, day, 12, 0, tzinfo=timezone.utc))
    observer.pressure = 0

    # Current planetary positions
    transit_positions = {}
    for name, body_cls in _PLANET_BODIES.items():
        try:
            body = body_cls()
            lon_deg = _ephem_to_ecliptic_lon(body, observer)
            transit_positions[name.lower()] = _ecliptic_lon_to_sign(lon_deg)
        except Exception as e:
            transit_positions[name.lower()] = {"sign": "Unknown", "degree": 0, "error": str(e)}

    # Compute aspects to natal chart if provided
    aspects: List[Dict[str, Any]] = []
    if natal_positions:
        natal_planets = natal_positions if isinstance(natal_positions, dict) else {}
        orb_tolerance = 3.0  # degrees

        for t_name, t_pos in transit_positions.items():
            t_lon = t_pos.get("longitude", 0)
            for n_name, n_pos in natal_planets.items():
                if not isinstance(n_pos, dict):
                    continue
                n_lon = n_pos.get("longitude", 0)

                for aspect_angle, aspect_name in ASPECT_NAMES.items():
                    diff = _angle_diff(t_lon, n_lon)
                    if abs(diff - aspect_angle) <= orb_tolerance:
                        orb = round(abs(diff - aspect_angle), 2)
                        aspects.append({
                            "transit_planet": t_name.capitalize(),
                            "aspect": aspect_name,
                            "natal_planet": n_name.capitalize(),
                            "orb": orb,
                            "description": (
                                f"Transit {t_name.capitalize()} {aspect_name} "
                                f"natal {n_name.capitalize()} (orb {orb}°)"
                            ),
                        })

    return {
        "date": date,
        "transit_positions": transit_positions,
        "aspects": aspects,
        "aspect_count": len(aspects),
    }


# ---------------------------------------------------------------------------
# Tool 4: knowledge_lookup (RAG with ChromaDB)
# ---------------------------------------------------------------------------

_chroma_collection = None  # Lazy-loaded singleton


def _get_knowledge_collection():
    """Load or create the ChromaDB collection from knowledge markdown files."""
    global _chroma_collection
    if _chroma_collection is not None:
        return _chroma_collection

    try:
        import chromadb

        knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge")
        knowledge_dir = os.path.abspath(knowledge_dir)
        chroma_dir = os.path.join(knowledge_dir, ".chroma")

        # Use persistent client
        client = chromadb.PersistentClient(path=chroma_dir)

        collection_name = "astrology_knowledge"

        try:
            collection = client.get_collection(collection_name)
            if collection.count() > 0:
                _chroma_collection = collection
                return _chroma_collection
        except Exception:
            pass

        # Build from scratch — load markdown files and embed
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        documents = []
        ids = []
        metadatas = []

        for filename in sorted(os.listdir(knowledge_dir)):
            if not filename.endswith(".md"):
                continue
            filepath = os.path.join(knowledge_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Split into chunks at ## headings for granularity
            chunks = []
            current_chunk: list = []
            for line in content.split("\n"):
                if line.startswith("## ") and current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = [line]
                else:
                    current_chunk.append(line)
            if current_chunk:
                chunks.append("\n".join(current_chunk))

            for i, chunk in enumerate(chunks):
                chunk_text = chunk.strip()
                if len(chunk_text) < 30:
                    continue
                doc_id = f"{filename}__chunk_{i}"
                documents.append(chunk_text)
                ids.append(doc_id)
                metadatas.append({"source": filename, "chunk_index": i})

        if documents:
            # Add in batches
            batch_size = 40
            for start_idx in range(0, len(documents), batch_size):
                end_idx = min(start_idx + batch_size, len(documents))
                collection.add(
                    documents=documents[start_idx:end_idx],
                    ids=ids[start_idx:end_idx],
                    metadatas=metadatas[start_idx:end_idx],
                )

        _chroma_collection = collection
        return _chroma_collection

    except Exception as e:
        print(f"[knowledge_lookup] ChromaDB init failed: {e}, using fallback")
        return None


def knowledge_lookup(query: str) -> str:
    """
    RAG-based knowledge lookup over curated astrology reference notes.
    Returns the top 2 most relevant chunks joined as a string.
    """
    if not query or not query.strip():
        return "Please provide a specific astrology question for me to look up."

    collection = _get_knowledge_collection()
    if collection is not None:
        try:
            results = collection.query(query_texts=[query], n_results=2)
            docs = results.get("documents", [[]])[0]
            if docs:
                return "\n\n---\n\n".join(docs)
        except Exception as e:
            print(f"[knowledge_lookup] Query failed: {e}")

    # Fallback: keyword-based lookup
    return _fallback_knowledge_lookup(query)


def _fallback_knowledge_lookup(query: str) -> str:
    """Fallback keyword-based lookup if ChromaDB is not available."""
    knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge")
    knowledge_dir = os.path.abspath(knowledge_dir)

    if not os.path.isdir(knowledge_dir):
        return "Astrology reference archives are not available at the moment."

    query_lower = query.lower()
    best_match = ""
    best_score = 0

    for filename in sorted(os.listdir(knowledge_dir)):
        if not filename.endswith(".md"):
            continue
        filepath = os.path.join(knowledge_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Simple keyword scoring
        score = 0
        for word in query_lower.split():
            if len(word) > 2 and word in content.lower():
                score += 1

        if score > best_score:
            best_score = score
            best_match = content[:1500]

    if best_match:
        return best_match
    return (
        "Astrology reference archives indicate that planetary movements shape "
        "personal potentials and cycles of destiny. Please ask about a specific "
        "sign, planet, house, or aspect for detailed guidance."
    )
