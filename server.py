from __future__ import annotations

import argparse
import colorsys
import json
import math
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
COMPONENTS = {
    "rgb": {"r": 255, "g": 255, "b": 255},
    "cmyk": {"c": 100, "m": 100, "y": 100, "k": 100},
    "hsv": {"h": 360, "s": 100, "v": 100},
    "hls": {"h": 360, "l": 100, "s": 100},
}


def clamp(value: float, low: float = 0, high: float = 1) -> float:
    return max(low, min(high, value))


def parse_components(model: str, values: object) -> dict[str, float]:
    if not isinstance(model, str) or model not in COMPONENTS:
        raise ValueError("Неизвестная цветовая модель.")
    if not isinstance(values, dict):
        raise ValueError("Нужен объект со значениями компонентов.")
    parsed = {}
    for name, maximum in COMPONENTS[model].items():
        raw = values.get(name)
        if isinstance(raw, bool):
            raise ValueError(f"Компонент {name.upper()} должен быть числом.")
        try:
            value = float(raw)
        except (TypeError, ValueError):
            raise ValueError(f"Компонент {name.upper()} должен быть числом.") from None
        if not math.isfinite(value) or not 0 <= value <= maximum:
            raise ValueError(f"Компонент {name.upper()} должен быть от 0 до {maximum}.")
        if model == "rgb" and not value.is_integer():
            raise ValueError(f"Компонент {name.upper()} должен быть целым числом.")
        parsed[name] = value
    return parsed


def source_to_rgb(model: str, values: dict[str, float]) -> tuple[float, float, float]:
    if model == "rgb":
        return tuple(values[name] / 255 for name in ("r", "g", "b"))
    if model == "cmyk":
        black = values["k"] / 100
        return tuple((1 - values[name] / 100) * (1 - black) for name in ("c", "m", "y"))
    if model == "hsv":
        return colorsys.hsv_to_rgb(values["h"] / 360, values["s"] / 100, values["v"] / 100)
    return colorsys.hls_to_rgb(values["h"] / 360, values["l"] / 100, values["s"] / 100)


def convert(model: str, values: object) -> dict:
    source = parse_components(model, values)
    r, g, b = (clamp(channel) for channel in source_to_rgb(model, source))
    maximum = max(r, g, b)
    black = 1 - maximum
    if maximum == 0:
        cyan = magenta = yellow = 0.0
    else:
        cyan, magenta, yellow = ((maximum - channel) / maximum for channel in (r, g, b))
    hsv_h, hsv_s, hsv_v = colorsys.rgb_to_hsv(r, g, b)
    hls_h, hls_l, hls_s = colorsys.rgb_to_hls(r, g, b)
    rgb8 = [round(channel * 255) for channel in (r, g, b)]
    result = {
        "rgb": {"r": r * 255, "g": g * 255, "b": b * 255},
        "cmyk": {"c": cyan * 100, "m": magenta * 100, "y": yellow * 100, "k": black * 100},
        "hsv": {"h": hsv_h * 360, "s": hsv_s * 100, "v": hsv_v * 100},
        "hls": {"h": hls_h * 360, "l": hls_l * 100, "s": hls_s * 100},
        "hex": "#" + "".join(f"{channel:02X}" for channel in rgb8),
    }
    result[model] = source
    return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass

    def send_data(self, status: int, data: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: int, payload: dict) -> None:
        self.send_data(status, json.dumps(payload, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/health":
            return self.send_json(200, {"status": "ok"})
        files = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
        }
        if path not in files:
            return self.send_json(404, {"error": "Страница не найдена."})
        filename, content_type = files[path]
        self.send_data(200, (ROOT / filename).read_bytes(), content_type)

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/api/convert":
            return self.send_json(404, {"error": "Метод не найден."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 4096:
                raise ValueError("Некорректный размер запроса.")
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError("Некорректный запрос.")
            result = convert(body.get("model"), body.get("values"))
        except (ValueError, json.JSONDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        self.send_json(200, result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Лабораторная работа 1: цветовые модели")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Откройте http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
