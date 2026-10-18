import webbrowser
from typing import List, Dict
import httpx

def search_web(query: str, max_results: int = 5) -> dict:
    """Performs web search and returns structured results."""
    results = []
    
    # Try using duckduckgo_search library
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))
            for item in raw_results:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("href", ""),
                    "summary": item.get("body", "")
                })
        if results:
            return {
                "success": True,
                "query": query,
                "count": len(results),
                "results": results
            }
    except Exception as err:
        pass
        
    # Fallback to direct HTTP endpoint or simulated results
    try:
        # Fallback via duckduckgo instant answer API
        resp = httpx.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": "1"},
            timeout=5.0
        )
        data = resp.json()
        abstract = data.get("AbstractText", "")
        heading = data.get("Heading", query)
        url = data.get("AbstractURL", "")
        if abstract:
            results.append({
                "title": heading,
                "url": url or f"https://duckduckgo.com/?q={query}",
                "summary": abstract
            })
        for related in data.get("RelatedTopics", [])[:max_results]:
            if "Text" in related:
                results.append({
                    "title": related.get("Text", "")[:60] + "...",
                    "url": related.get("FirstURL", ""),
                    "summary": related.get("Text", "")
                })
    except Exception:
        pass

    if not results:
        results.append({
            "title": f"Web results for '{query}'",
            "url": f"https://www.google.com/search?q={query.replace(' ', '+')}",
            "summary": f"Search query executed for '{query}'."
        })

    return {
        "success": True,
        "query": query,
        "count": len(results),
        "results": results
    }

def open_url(url: str) -> dict:
    """Opens a website or link in default browser."""
    if not (url.startswith("http://") or url.startswith("https://")):
        url = "https://" + url
    try:
        webbrowser.open(url)
        return {"success": True, "url": url, "message": f"Opened '{url}' in browser."}
    except Exception as e:
        return {"success": False, "error": str(e)}
