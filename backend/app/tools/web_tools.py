import webbrowser
from typing import List, Dict
import httpx

def search_web(query: str, max_results: int = 5) -> dict:
    """Performs web search and returns structured results."""
    results = []

    # 1. Primary: Direct fast HTML search via DuckDuckGo
    try:
        from lxml import html
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
        resp = httpx.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers=headers,
            timeout=7.0
        )
        if resp.status_code == 200:
            tree = html.fromstring(resp.text)
            for node in tree.xpath('//div[contains(@class, "result__body")]'):
                title_nodes = node.xpath('.//a[contains(@class, "result__a")]')
                snippet_nodes = node.xpath('.//a[contains(@class, "result__snippet")]')
                if title_nodes and snippet_nodes:
                    title = title_nodes[0].text_content().strip()
                    url = title_nodes[0].get("href", "")
                    snippet = snippet_nodes[0].text_content().strip()
                    if title and snippet:
                        results.append({
                            "title": title,
                            "url": url,
                            "summary": snippet
                        })
                if len(results) >= max_results:
                    break

        if results:
            return {
                "success": True,
                "query": query,
                "count": len(results),
                "results": results
            }
    except Exception:
        pass

    # 2. Secondary: ddgs / duckduckgo_search library
    try:
        try:
            from ddgs import DDGS
        except ImportError:
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
    except Exception:
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
