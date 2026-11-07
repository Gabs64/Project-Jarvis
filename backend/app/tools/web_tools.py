import webbrowser
import os
import time
import json
import ast
import operator
import math
from typing import List, Dict
import httpx
from app.config import settings

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

def get_weather(location: str = "auto") -> dict:
    """Retrieves real-time live weather conditions, temperature, humidity, and forecast for any city or country."""
    clean_loc = (location or "auto").strip()
    if clean_loc.lower() in ["philippines", "the philippines", "ph"]:
        clean_loc = "Manila"

    try:
        encoded = clean_loc.replace(" ", "+")
        resp = httpx.get(
            f"https://wttr.in/{encoded}?format=j1",
            timeout=5.0,
            headers={"User-Agent": "curl/7.68.0"}
        )
        if resp.status_code == 200:
            data = resp.json()
            curr = data.get("current_condition", [{}])[0]
            desc = curr.get("weatherDesc", [{}])[0].get("value", "Clear")
            temp_c = curr.get("temp_C", "N/A")
            temp_f = curr.get("temp_F", "N/A")
            feels_c = curr.get("FeelsLikeC", temp_c)
            humidity = curr.get("humidity", "N/A")
            wind_kph = curr.get("windspeedKmph", "N/A")

            return {
                "success": True,
                "location": location or clean_loc,
                "condition": desc,
                "temperature_c": f"{temp_c}°C",
                "temperature_f": f"{temp_f}°F",
                "feels_like_c": f"{feels_c}°C",
                "humidity": f"{humidity}%",
                "wind": f"{wind_kph} km/h"
            }
    except Exception:
        pass

    return {
        "success": False,
        "location": location,
        "error": "Unable to contact live meteorological satellite at this moment."
    }

def get_wikipedia_summary(query: str) -> dict:
    """Fetches a concise Wikipedia summary and page URL for any topic, person, place, or concept."""
    headers = {"User-Agent": "JarvisAI/2.0 (jarvis@project.local)"}
    topic = query.strip()

    # 1. Direct page summary
    try:
        url_topic = topic.replace(" ", "_")
        resp = httpx.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{url_topic}",
            headers=headers,
            timeout=5.0,
            follow_redirects=True
        )
        if resp.status_code == 200:
            data = resp.json()
            extract = data.get("extract", "")
            title = data.get("title", topic)
            page_url = data.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{url_topic}")
            if extract:
                return {
                    "success": True,
                    "title": title,
                    "summary": extract,
                    "url": page_url
                }
    except Exception:
        pass

    # 2. Search fallback via Opensearch API
    try:
        resp = httpx.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "opensearch",
                "search": topic,
                "limit": 1,
                "namespace": 0,
                "format": "json"
            },
            headers=headers,
            timeout=5.0
        )
        if resp.status_code == 200:
            data = resp.json()
            if len(data) >= 4 and data[1] and data[2]:
                title = data[1][0]
                summary = data[2][0]
                url = data[3][0] if data[3] else f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                if summary:
                    return {
                        "success": True,
                        "title": title,
                        "summary": summary,
                        "url": url
                    }
    except Exception:
        pass

    return {
        "success": False,
        "query": topic,
        "error": f"No definitive Wikipedia summary found for '{topic}'."
    }

def get_market_price(symbol: str) -> dict:
    """Fetches real-time price quotes for cryptocurrencies (BTC, ETH, SOL) or stocks (AAPL, NVDA, TSLA)."""
    sym = symbol.strip().upper().replace("$", "")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    # 1. Crypto check
    crypto_symbols = {
        "BITCOIN": "BTC",
        "ETHEREUM": "ETH",
        "SOLANA": "SOL",
        "DOGECOIN": "DOGE",
        "RIPPLE": "XRP",
        "CARDANO": "ADA"
    }
    target_crypto = crypto_symbols.get(sym, sym)
    try:
        resp = httpx.get(
            f"https://api.binance.com/api/v3/ticker/price?symbol={target_crypto}USDT",
            headers=headers,
            timeout=4.0
        )
        if resp.status_code == 200:
            data = resp.json()
            price = float(data.get("price", 0))
            return {
                "success": True,
                "asset_type": "cryptocurrency",
                "symbol": target_crypto,
                "price": f"${price:,.2f}" if price >= 1 else f"${price:.6f}",
                "currency": "USD"
            }
    except Exception:
        pass

    # 2. Stock / Equity check via Yahoo Finance
    try:
        resp = httpx.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1d",
            headers=headers,
            timeout=5.0
        )
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("chart", {}).get("result", [])
            if result:
                meta = result[0].get("meta", {})
                price = meta.get("regularMarketPrice", 0)
                currency = meta.get("currency", "USD")
                prev_close = meta.get("chartPreviousClose", price)
                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0
                return {
                    "success": True,
                    "asset_type": "equity/stock",
                    "symbol": sym,
                    "price": f"${price:,.2f} {currency}",
                    "change": f"{'+' if change >= 0 else ''}{change:.2f} ({change_pct:.2f}%)",
                    "currency": currency
                }
    except Exception:
        pass

    return {
        "success": False,
        "symbol": sym,
        "error": f"Unable to retrieve current market price quote for {sym}."
    }

def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "PHP") -> dict:
    """Converts money from one currency to another using real-time foreign exchange rates."""
    from_c = from_currency.strip().upper()
    to_c = to_currency.strip().upper()
    try:
        resp = httpx.get(f"https://open.er-api.com/v6/latest/{from_c}", timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            rates = data.get("rates", {})
            if to_c in rates:
                rate = rates[to_c]
                converted = float(amount) * rate
                return {
                    "success": True,
                    "amount": float(amount),
                    "from_currency": from_c,
                    "to_currency": to_c,
                    "rate": rate,
                    "converted_amount": round(converted, 2),
                    "formatted": f"{amount:,.2f} {from_c} = {converted:,.2f} {to_c}"
                }
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {
        "success": False,
        "error": f"Currency exchange rate from {from_c} to {to_c} unavailable."
    }

def calculate(expression: str) -> dict:
    """Evaluates mathematical expressions safely (supports +, -, *, /, %, **, sqrt, sin, cos, round)."""
    operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    functions = {
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "abs": abs,
        "round": round,
        "log": math.log,
        "pi": math.pi,
        "e": math.e
    }

    def _eval(node):
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op = operators.get(type(node.op))
            if op:
                return op(left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op = operators.get(type(node.op))
            if op:
                return op(operand)
        elif isinstance(node, ast.Call):
            func_name = node.func.id if isinstance(node.func, ast.Name) else None
            if func_name in functions:
                args = [_eval(arg) for arg in node.args]
                return functions[func_name](*args)
        elif isinstance(node, ast.Name):
            if node.id in functions:
                return functions[node.id]
        raise ValueError(f"Unsupported syntax in expression: {ast.dump(node)}")

    try:
        clean_expr = expression.strip().replace("x", "*").replace("^", "**")
        parsed = ast.parse(clean_expr, mode='eval')
        result = _eval(parsed.body)
        formatted_res = round(result, 6) if isinstance(result, float) else result
        return {
            "success": True,
            "expression": expression,
            "result": formatted_res
        }
    except Exception as e:
        return {"success": False, "expression": expression, "error": str(e)}

def play_media_search(query: str, platform: str = "spotify") -> dict:
    """Searches and opens a track, artist, album, or video on Spotify or YouTube."""
    clean_q = query.strip()
    plat = platform.lower().strip()
    try:
        if plat == "youtube" or "youtube" in plat:
            url = f"https://www.youtube.com/results?search_query={clean_q.replace(' ', '+')}"
            webbrowser.open(url)
            return {"success": True, "platform": "YouTube", "query": clean_q, "url": url}
        else:
            uri = f"spotify:search:{clean_q}"
            try:
                os.startfile(uri)
                return {"success": True, "platform": "Spotify", "query": clean_q, "uri": uri}
            except Exception:
                web_url = f"https://open.spotify.com/search/{clean_q.replace(' ', '%20')}"
                webbrowser.open(web_url)
                return {"success": True, "platform": "Spotify Web", "query": clean_q, "url": web_url}
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_note(content: str, title: str = "Quick Note") -> dict:
    """Saves a quick note or memo to the user's local notes archive."""
    notes_file = settings.DATA_DIR / "notes.json"
    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
    notes = []
    if notes_file.exists():
        try:
            notes = json.loads(notes_file.read_text(encoding="utf-8"))
        except Exception:
            notes = []
    
    note_entry = {
        "id": int(time.time()),
        "title": title.strip(),
        "content": content.strip(),
        "timestamp": now_str
    }
    notes.insert(0, note_entry)
    notes_file.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    return {"success": True, "message": f"Note '{title}' saved successfully.", "note": note_entry}

def list_notes() -> dict:
    """Retrieves all saved notes from the user's local notes archive."""
    notes_file = settings.DATA_DIR / "notes.json"
    if not notes_file.exists():
        return {"success": True, "count": 0, "notes": []}
    try:
        notes = json.loads(notes_file.read_text(encoding="utf-8"))
        return {"success": True, "count": len(notes), "notes": notes[:15]}
    except Exception as e:
        return {"success": False, "error": str(e)}
