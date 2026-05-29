from typing import Dict, Any

def geocode_place(place: str) -> Dict[str, Any]:
    """Mock geocode service returning fixed coordinates and timezone."""
    # In a real app this would query a geocoding API
    return {
        "lat": 16.3,
        "lon": 80.4,
        "timezone": "Asia/Kolkata"
    }

def compute_birth_chart() -> Dict[str, Any]:
    """Mock birth chart calculator."""
    # In a real app this would call flatlib or an external ephemeris
    return {
        "sun": "Aries",
        "moon": "Cancer",
        "ascendant": "Leo"
    }

def get_daily_transits() -> Dict[str, Any]:
    """Mock daily transit calculator."""
    return {
        "venus": "Taurus",
        "mars": "Gemini"
    }

def knowledge_lookup(query: str) -> str:
    """Mock astrology knowledge base lookup."""
    query_lower = query.lower()
    if "venus" in query_lower or "taurus" in query_lower:
        return "Venus in Taurus represents a placement of deep sensuality, appreciation of comfort, and steady financial or relational values."
    elif "mars" in query_lower or "gemini" in query_lower:
        return "Mars in Gemini signifies sharp intellect, dualistic desires, and dynamic communicative action."
    elif "ascendant" in query_lower or "leo" in query_lower:
        return "Ascendant in Leo indicates a warm, expressive, and charismatic presence with strong leadership potentials."
    return "Astrology reference archives indicate that planetary movements shape personal potentials and cycles of destiny."
