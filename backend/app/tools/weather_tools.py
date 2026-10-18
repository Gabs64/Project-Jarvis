import httpx
from typing import Optional, Dict, Any

def get_weather(location: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves real-time weather and temperature telemetry for a specified city 
    or the user's current location via IP geolocation.
    """
    loc_path = location.strip().replace(" ", "+") if location else ""
    url = f"https://wttr.in/{loc_path}?format=j1" if loc_path else "https://wttr.in/?format=j1"
    
    try:
        resp = httpx.get(url, timeout=6.0, headers={"User-Agent": "Jarvis-Desktop/1.0"})
        if resp.status_code == 200:
            data = resp.json()
            curr = data.get("current_condition", [{}])[0]
            nearest = data.get("nearest_area", [{}])[0]
            
            city = ""
            if nearest.get("areaName"):
                city = nearest["areaName"][0].get("value", "")
            region = ""
            if nearest.get("region"):
                region = nearest["region"][0].get("value", "")
            country = ""
            if nearest.get("country"):
                country = nearest["country"][0].get("value", "")
                
            loc_label = f"{city}, {country}".strip(", ") if city else (location or "Local Area")
            
            desc = ""
            if curr.get("weatherDesc"):
                desc = curr["weatherDesc"][0].get("value", "")
                
            temp_c = curr.get("temp_C", "--")
            temp_f = curr.get("temp_F", "--")
            feels_like_c = curr.get("FeelsLikeC", temp_c)
            humidity = curr.get("humidity", "--")
            wind_kmph = curr.get("windspeedKmph", "--")
            
            return {
                "success": True,
                "location": loc_label,
                "city": city,
                "condition": desc,
                "temp_c": temp_c,
                "temp_f": temp_f,
                "feels_like_c": feels_like_c,
                "humidity": f"{humidity}%",
                "wind_kmph": f"{wind_kmph} km/h",
                "summary": f"In {loc_label}, it is currently {temp_c}°C ({temp_f}°F) with {desc.lower()} and {humidity}% humidity."
            }
    except Exception as e:
        pass
        
    return {
        "success": False,
        "location": location or "Current Location",
        "error": "Weather telemetry temporarily unavailable."
    }
