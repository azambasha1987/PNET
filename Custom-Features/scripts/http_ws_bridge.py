#!/usr/bin/env python3
"""
http_ws_bridge.py — same-origin HTTP + WebSocket reverse proxy for embedding a
Docker node's web console inside a PNetLab iframe.

WHY THIS EXISTS
---------------
Some lab nodes (voip/SIP.js, code-server, gitea, LibreNMS, netdevops dashboards)
present an http/https web UI on a container port. PNetLab wants to show that UI
inside an <iframe> on the same origin as the appliance, so the session cookie,
CSP, and framing all come from PNetLab rather than the node. A raw cross-origin
iframe to the node's IP:port breaks (mixed content, X-Frame-Options, CSP, no
auth). This bridge fronts the node behind an authenticated, same-origin path:

    browser ──▶ Apache (session-cookie gated)
                  proxies  /console/http/<token>/<rest>
                  ──▶ strips the /console/http/ prefix ──▶
              http://127.0.0.1:8025/<token>/<rest>  (THIS packaged bridge)
                  ──▶ token → (scheme,host,port) lookup ──▶
              <scheme>://<host>:<port>/<rest>   (the node's web console)

The bridge is DUMB about authentication. Apache + the PHP session are the gate.
The bridge's only job is: map an opaque token to a backend target via a trusted
grant store, then faithfully proxy HTTP and WebSocket both ways, rewriting URLs
so the browser stays inside the /console/http/<token>/ prefix.

SECURITY — the anti-SSRF invariant
----------------------------------
The ONLY source of the backend scheme/host/port is the grant-store file lookup
keyed by the opaque token. The bridge NEVER reads a host, port, or scheme from
the request URL, query string, headers, or body. The token itself is validated
against ^[a-f0-9]{16,64}$ BEFORE it is used as a filename (so it can't traverse
out of the store dir), and the stored host must parse as an IP literal. An
unknown or malformed token is refused with 403. This is what prevents a client
from steering the bridge at an arbitrary internal address (cross-tenant SSRF).

GRANT-STORE CONTRACT  (the PHP minter + this bridge must agree byte-for-byte)
----------------------------------------------------------------------------
  * Directory:  /dev/shm/pnet-http-tokens/   (env PNET_HTTP_TOKEN_DIR)
  * One file per grant. Filename = the opaque token, matching ^[a-f0-9]{16,64}$.
  * File content = a SINGLE line:   "<scheme> <host> <port>"
        scheme ∈ {http, https}
        host   = an IP literal (v4 or v6)
        port   = integer 1..65535
    e.g.   "https 10.0.137.4 8443"
  * The target is re-read from disk on every NEW connection — no caching — so a
    revoked/rotated grant takes effect immediately. Missing or malformed file
    ⇒ the connection is refused (403 for HTTP, 4403 close for WS).
  * Grants are minted (and expired/removed) by PHP elsewhere; this bridge never
    writes to the store.

REQUEST/RESPONSE HANDLING
-------------------------
Apache has already stripped the "/console/http/" prefix, so this bridge sees
"/<token>/<rest>?<query>". The first path segment is the token; everything after
it (path + query) is the backend request-target "/<rest>".

  * HTTP: method, headers (minus Host/hop-by-hop/Accept-Encoding), and body are
    forwarded to <scheme>://<host>:<port>/<rest>. https backends are dialed with
    TLS verification DISABLED (self-signed lab certs — mirrors the engine's own
    CURLOPT_SSL_VERIFYPEER=false in api_nodes.php). The response is buffered and
    streamed back with these rewrites (browser-facing prefix = /console/http/<token>/):
      - text/html body: inject <base href="/console/http/<token>/"> as the first
        child of <head>, and prefix ROOT-ABSOLUTE (leading single "/") values of
        src/href/action and htmx hx-get/hx-post/hx-put/hx-delete/hx-patch with
        /console/http/<token>. Protocol-relative "//host" and already-prefixed
        values are left alone. This is a pragmatic targeted rewrite, NOT a full
        HTML parse; relative URLs already resolve correctly via <base>.
      - headers Location / Content-Location / Refresh: root-absolute values are
        prefixed with /console/http/<token>.
      - Set-Cookie: Path=/... is rewritten to Path=/console/http/<token>/... (and
        a Path defaulting to the prefix is added when the cookie had none).
      - X-Frame-Options, Content-Security-Policy, Content-Security-Policy-Report-Only
        are STRIPPED so the node app can't veto being framed.
      - hop-by-hop headers (Connection, Keep-Alive, Transfer-Encoding, Upgrade,
        TE, Trailer, Proxy-*) and Content-Encoding are dropped; Content-Length is
        recomputed from the (possibly rewritten) body.

  * WebSocket: when the incoming request is a WS upgrade (Apache proxy_wstunnel
    forwards Upgrade: websocket), the bridge completes the client handshake
    itself, opens a backend WS to ws(s)://<host>:<port>/<rest> (wss + verify-off
    for https backends), forwards the requested subprotocol + Cookie/Origin/
    Authorization, and pipes text+binary frames both ways. Either side closing
    tears down the other. This carries SIP.js /ws, code-server, gitea live.

ROBUSTNESS
----------
Every connection is handled inside its own try/except; one bad request or a
backend failure never takes the process down. Backend connect failure ⇒ 502
(HTTP) or a 1011/4502 WS close. The listener binds loopback only.

DEPENDENCIES
------------
  * httpx     — async HTTP client for the backend leg (verify=False for https).
                Already installed on the appliance (bundled for the MCP server,
                installer step [11d]: "mcp uvicorn httpx anthropic openai").
  * websockets — async WS *client* (websockets.connect) for the backend WS leg.
                Already required by the telnet/shell bridges (apt python3-websockets).
The incoming HTTP/1.1 parse and the incoming (server-side) WebSocket handshake +
frame codec are hand-rolled on plain asyncio streams — deliberately, so this one
port can serve BOTH plain HTTP and WS without depending on any particular
websockets-server API version (which has churned across 10/11/12/13).

RUN
---
  python3 http_ws_bridge.py
Env:  PNET_HTTP_BRIDGE_PORT (standalone default 8024; packaged unit sets 8025)
      PNET_HTTP_BRIDGE_HOST (default 127.0.0.1)
      PNET_HTTP_TOKEN_DIR   (default /dev/shm/pnet-http-tokens)
"""
import asyncio
import base64
import hashlib
import ipaddress
import os
import re
import ssl
import struct
import sys
from urllib.parse import urlsplit

import httpx
import websockets

# ─────────────────────────── configuration ────────────────────────────
TOKEN_DIR   = os.environ.get("PNET_HTTP_TOKEN_DIR", "/dev/shm/pnet-http-tokens")
LISTEN_HOST = os.environ.get("PNET_HTTP_BRIDGE_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("PNET_HTTP_BRIDGE_PORT", "8024"))

# Browser-facing path prefix that Apache exposes and strips before us.
BROWSER_PREFIX = "/console/http"          # + "/<token>" is prepended per request

TOKEN_RE = re.compile(r"^[a-f0-9]{16,64}$")
WS_GUID  = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"   # RFC 6455 magic

# Hop-by-hop headers (RFC 7230 §6.1) plus framing headers we always re-derive.
HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "trailers", "transfer-encoding", "upgrade",
}
# Response headers we refuse to pass through so a node can't break embedding.
STRIP_RESP = {
    "x-frame-options",
    "content-security-policy",
    "content-security-policy-report-only",
    "content-encoding",       # httpx already served identity (Accept-Encoding dropped)
    "content-length",         # recomputed from the (possibly rewritten) body
}

# Attribute URL rewrite for the text/html fallback (see module docstring).
_ATTR_RE = re.compile(
    rb'''((?:src|href|action|hx-get|hx-post|hx-put|hx-delete|hx-patch)\s*=\s*)(["'])(/(?!/)[^"'>\s]*)\2''',
    re.IGNORECASE,
)
_HEAD_RE = re.compile(rb"<head[^>]*>", re.IGNORECASE)


def log(msg):
    print(f"[http_ws_bridge] {msg}", file=sys.stderr, flush=True)


# ─────────────────────────── grant store ──────────────────────────────
def resolve_token(token):
    """Map an opaque token to (scheme, host, port) via the trusted grant store.

    Returns a tuple or None. The token is validated as a safe filename BEFORE it
    touches the filesystem, and the stored host must be an IP literal — the two
    guards that keep this from being an SSRF primitive. Re-read every call; never
    cached.
    """
    if not token or not TOKEN_RE.match(token):
        return None
    path = os.path.join(TOKEN_DIR, token)
    try:
        # realpath guard: the resolved file must stay inside the store dir.
        if os.path.dirname(os.path.realpath(path)) != os.path.realpath(TOKEN_DIR):
            return None
        with open(path, "r") as fh:
            line = fh.readline().strip()
    except OSError:
        return None
    parts = line.split()
    if len(parts) != 3:
        return None
    scheme, host, port_s = parts
    if scheme not in ("http", "https"):
        return None
    try:
        ipaddress.ip_address(host)          # host MUST be an IP literal
        port = int(port_s)
    except ValueError:
        return None
    if not (1 <= port <= 65535):
        return None
    return scheme, host, port


# ─────────────────────── incoming HTTP/1.1 parse ───────────────────────
async def read_http_head(reader):
    """Read request line + headers up to the blank line. Returns
    (method, target, version, headers_list) or None on EOF/oversize/garbage.
    headers_list preserves order and duplicates as (lower_name, raw_value)."""
    try:
        head = await reader.readuntil(b"\r\n\r\n")
    except (asyncio.IncompleteReadError, asyncio.LimitOverrunError, ConnectionError):
        return None
    try:
        text = head.decode("latin-1")
    except UnicodeDecodeError:
        return None
    lines = text.split("\r\n")
    request_line = lines[0]
    bits = request_line.split(" ")
    if len(bits) < 3:
        return None
    method, target, version = bits[0], bits[1], bits[2]
    headers = []
    for ln in lines[1:]:
        if not ln:
            continue
        if ":" not in ln:
            continue
        name, _, value = ln.partition(":")
        headers.append((name.strip().lower(), value.strip()))
    return method, target, version, headers


def header_get(headers, name):
    name = name.lower()
    for n, v in headers:
        if n == name:
            return v
    return None


async def read_body(reader, headers):
    """Read the request body per Content-Length or chunked Transfer-Encoding."""
    te = (header_get(headers, "transfer-encoding") or "").lower()
    if "chunked" in te:
        chunks = []
        while True:
            size_line = await reader.readline()
            if not size_line:
                break
            size = size_line.strip().split(b";")[0]
            try:
                n = int(size, 16)
            except ValueError:
                break
            if n == 0:
                # consume trailing CRLF / trailers up to blank line
                try:
                    await reader.readuntil(b"\r\n")
                except (asyncio.IncompleteReadError, asyncio.LimitOverrunError):
                    pass
                break
            chunks.append(await reader.readexactly(n))
            await reader.readexactly(2)     # trailing CRLF
        return b"".join(chunks)
    cl = header_get(headers, "content-length")
    if cl:
        try:
            n = int(cl)
        except ValueError:
            return b""
        if n > 0:
            try:
                return await reader.readexactly(n)
            except asyncio.IncompleteReadError as exc:
                return exc.partial
    return b""


def split_token(target):
    """'/<token>/<rest>?<q>' -> (token, '/<rest>?<q>'). Backend target keeps the
    query. A bare '/<token>' yields rest '/'."""
    path_q = target
    # keep query attached to the backend path; only split on the first path seg.
    raw = path_q.lstrip("/")
    token, sep, remainder = raw.partition("/")
    # token may itself carry a query if there is no rest: '/<token>?x'
    if "?" in token:
        token, _, q = token.partition("?")
        rest = "/?" + q
    else:
        rest = "/" + remainder if sep else "/"
    return token, rest


# ──────────────────────── HTTP response helpers ─────────────────────────
def rewrite_location(value, prefix):
    if value.startswith("/") and not value.startswith("//"):
        return prefix + value
    return value


def rewrite_refresh(value, prefix):
    # "5; url=/path"  ->  "5; url=/console/http/<token>/path"
    def _sub(m):
        url = m.group(2)
        return m.group(1) + rewrite_location(url, prefix)
    return re.sub(r"(?i)(url=)(\S+)", _sub, value)


def rewrite_set_cookie(value, prefix):
    if re.search(r"(?i);\s*path=", value):
        def _sub(m):
            return m.group(1) + prefix + m.group(2)
        return re.sub(r"(?i)(;\s*path=)(/[^;]*)", _sub, value)
    # No Path attribute: pin it to the prefix so the browser scopes it correctly.
    return value.rstrip() + f"; Path={prefix}/"


def rewrite_html(body, prefix):
    """Inject <base> and prefix root-absolute attribute URLs. Byte-level so the
    original charset is never disturbed."""
    base_tag = f'<base href="{prefix}/">'.encode("latin-1")

    def _head(m):
        return m.group(0) + base_tag
    if _HEAD_RE.search(body):
        body = _HEAD_RE.sub(_head, body, count=1)
    else:
        body = base_tag + body      # no <head>; best-effort prepend

    prefix_b = prefix.encode("latin-1")

    def _attr(m):
        val = m.group(3)
        if val.startswith(prefix_b + b"/") or val == prefix_b:
            return m.group(0)
        return m.group(1) + m.group(2) + prefix_b + val + m.group(2)
    return _ATTR_RE.sub(_attr, body)


def build_forward_request_headers(headers, host, port):
    """Client → backend request headers: drop Host/hop-by-hop/framing/Accept-
    Encoding, set Host to the backend authority. Accept-Encoding is stripped so
    the backend returns identity and we never juggle a stale Content-Encoding."""
    out = []
    for name, value in headers:
        if name in HOP_BY_HOP or name in ("host", "content-length", "accept-encoding"):
            continue
        out.append((name, value))
    out.append(("host", f"{host}:{port}"))
    return out


def build_response_headers(resp, prefix):
    """Backend → client response headers with the rewrites/strips applied."""
    out = []
    for name, value in resp.headers.multi_items():
        low = name.lower()
        if low in HOP_BY_HOP or low in STRIP_RESP:
            continue
        if low in ("location", "content-location"):
            value = rewrite_location(value, prefix)
        elif low == "refresh":
            value = rewrite_refresh(value, prefix)
        elif low == "set-cookie":
            value = rewrite_set_cookie(value, prefix)
        out.append((name, value))
    return out


async def write_http_response(writer, status_code, reason, headers, body):
    lines = [f"HTTP/1.1 {status_code} {reason}"]
    for name, value in headers:
        lines.append(f"{name}: {value}")
    lines.append(f"Content-Length: {len(body)}")
    lines.append("Connection: close")
    head = ("\r\n".join(lines) + "\r\n\r\n").encode("latin-1")
    writer.write(head)
    if body:
        writer.write(body)
    await writer.drain()


async def send_simple(writer, code, reason, text=""):
    body = text.encode("utf-8")
    await write_http_response(
        writer, code, reason,
        [("Content-Type", "text/plain; charset=utf-8")], body,
    )


# ──────────────────────────── HTTP proxy ───────────────────────────────
_http_client = None


def get_http_client():
    global _http_client
    if _http_client is None:
        # verify=False: self-signed lab certs (mirrors CURLOPT_SSL_VERIFYPEER=false).
        _http_client = httpx.AsyncClient(
            verify=False,
            follow_redirects=False,
            timeout=httpx.Timeout(30.0, connect=10.0),
        )
    return _http_client


async def proxy_http(writer, method, rest, headers, body, scheme, host, port, prefix):
    url = f"{scheme}://{host}:{port}{rest}"
    fwd_headers = build_forward_request_headers(headers, host, port)
    client = get_http_client()
    try:
        # Stream the backend response to relay non-HTML (e.g. MJPEG previews,
        # Server-Sent Events) immediately as chunks arrive without buffer starvation.
        req = client.build_request(
            method, url, headers=fwd_headers,
            content=body if body else None,
            timeout=httpx.Timeout(None, connect=10.0),
        )
        resp = await client.send(req, stream=True)
    except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
        log(f"backend connect failed {url}: {exc}")
        await send_simple(writer, 502, "Bad Gateway", "backend connect failed")
        return
    except httpx.HTTPError as exc:
        log(f"backend request error {url}: {exc}")
        await send_simple(writer, 502, "Bad Gateway", "backend request error")
        return

    try:
        ctype = resp.headers.get("content-type", "")
        reason = resp.reason_phrase or ""
        out_headers = build_response_headers(resp, prefix)

        # HTML pages are buffered and rewritten with base tag & prefixed routes
        if method.upper() != "HEAD" and "text/html" in ctype.lower():
            out_body = await resp.aread()
            if out_body:
                out_body = rewrite_html(out_body, prefix)
            await write_http_response(writer, resp.status_code, reason, out_headers, out_body)
        elif method.upper() == "HEAD":
            cl = resp.headers.get("content-length", "0")
            lines = [f"HTTP/1.1 {resp.status_code} {reason}"]
            for name, value in out_headers:
                lines.append(f"{name}: {value}")
            lines.append(f"Content-Length: {cl}")
            lines.append("Connection: close")
            head = ("\r\n".join(lines) + "\r\n\r\n").encode("latin-1")
            writer.write(head)
            await writer.drain()
        else:
            # Non-HTML responses (MJPEG previews, server-sent events, raw binary streams)
            # are relayed as they arrive instead of being buffered.
            lines = [f"HTTP/1.1 {resp.status_code} {reason}"]
            for name, value in out_headers:
                lines.append(f"{name}: {value}")
            cl = resp.headers.get("content-length")
            if cl is not None and cl.isdigit():
                lines.append(f"Content-Length: {cl}")
            lines.append("Connection: close")
            head = ("\r\n".join(lines) + "\r\n\r\n").encode("latin-1")
            writer.write(head)
            await writer.drain()

            try:
                async for chunk in resp.aiter_bytes():
                    if chunk:
                        writer.write(chunk)
                        await writer.drain()
            except (ConnectionResetError, BrokenPipeError, asyncio.CancelledError):
                pass
    finally:
        await resp.aclose()


# ─────────────────── incoming (server-side) WS codec ────────────────────
def ws_accept_key(client_key):
    digest = hashlib.sha1((client_key + WS_GUID).encode("latin-1")).digest()
    return base64.b64encode(digest).decode("ascii")


def ws_encode(opcode, data):
    """Server → client frame (unmasked, FIN=1)."""
    b1 = 0x80 | (opcode & 0x0f)
    n = len(data)
    if n < 126:
        header = struct.pack(">BB", b1, n)
    elif n < 65536:
        header = struct.pack(">BBH", b1, 126, n)
    else:
        header = struct.pack(">BBQ", b1, 127, n)
    return header + data


async def ws_read_message(reader):
    """Read one complete client message. Returns (kind, data) where kind is
    'text' | 'binary' | 'ping' | 'pong' | 'close', or None on EOF."""
    frames = []
    msg_opcode = None
    while True:
        try:
            hdr = await reader.readexactly(2)
        except asyncio.IncompleteReadError:
            return None
        b1, b2 = hdr[0], hdr[1]
        fin = b1 & 0x80
        opcode = b1 & 0x0f
        masked = b2 & 0x80
        length = b2 & 0x7f
        try:
            if length == 126:
                length = struct.unpack(">H", await reader.readexactly(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", await reader.readexactly(8))[0]
            mask = await reader.readexactly(4) if masked else b""
            payload = await reader.readexactly(length) if length else b""
        except asyncio.IncompleteReadError:
            return None
        if masked and payload:
            payload = bytes(payload[i] ^ mask[i % 4] for i in range(length))
        if opcode == 0x8:
            return "close", payload
        if opcode == 0x9:
            return "ping", payload
        if opcode == 0xA:
            return "pong", payload
        if opcode == 0x0:            # continuation
            frames.append(payload)
        else:                        # 0x1 text | 0x2 binary
            msg_opcode = opcode
            frames.append(payload)
        if fin:
            full = b"".join(frames)
            return ("text" if msg_opcode == 0x1 else "binary"), full


# ──────────────────────────── WS proxy ─────────────────────────────────
async def proxy_ws(reader, writer, headers, rest, scheme, host, port):
    client_key = header_get(headers, "sec-websocket-key")
    if not client_key:
        await send_simple(writer, 400, "Bad Request", "missing Sec-WebSocket-Key")
        return
    subprotocol = header_get(headers, "sec-websocket-protocol")

    ws_scheme = "wss" if scheme == "https" else "ws"
    backend_url = f"{ws_scheme}://{host}:{port}{rest}"

    ssl_ctx = None
    if ws_scheme == "wss":
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

    # Forward a minimal, safe set of headers to the backend handshake.
    fwd = {}
    for h in ("cookie", "authorization", "origin"):
        v = header_get(headers, h)
        if v:
            fwd[h] = v
    subprotocols = [p.strip() for p in subprotocol.split(",")] if subprotocol else None

    connect_kwargs = dict(uri=backend_url)
    if ssl_ctx is not None:
        connect_kwargs["ssl"] = ssl_ctx
    if subprotocols:
        connect_kwargs["subprotocols"] = subprotocols

    # websockets renamed extra_headers -> additional_headers around v12; try both.
    backend = None
    for hdr_kw in ("additional_headers", "extra_headers"):
        try:
            kwargs = dict(connect_kwargs)
            if fwd:
                kwargs[hdr_kw] = fwd
            backend = await websockets.connect(**kwargs)
            break
        except TypeError:
            continue
        except Exception as exc:
            log(f"backend WS connect failed {backend_url}: {exc}")
            await send_simple(writer, 502, "Bad Gateway", "backend ws connect failed")
            return
    if backend is None:
        # header kw both rejected for a non-TypeError reason, or no headers path
        try:
            backend = await websockets.connect(**connect_kwargs)
        except Exception as exc:
            log(f"backend WS connect failed {backend_url}: {exc}")
            await send_simple(writer, 502, "Bad Gateway", "backend ws connect failed")
            return

    # Complete the client-facing handshake (101).
    negotiated = getattr(backend, "subprotocol", None)
    resp_lines = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        f"Sec-WebSocket-Accept: {ws_accept_key(client_key)}",
    ]
    if negotiated:
        resp_lines.append(f"Sec-WebSocket-Protocol: {negotiated}")
    writer.write(("\r\n".join(resp_lines) + "\r\n\r\n").encode("latin-1"))
    await writer.drain()

    async def client_to_backend():
        try:
            while True:
                msg = await ws_read_message(reader)
                if msg is None:
                    break
                kind, data = msg
                if kind == "close":
                    break
                if kind == "ping":
                    writer.write(ws_encode(0xA, data))   # reply pong to client
                    await writer.drain()
                    continue
                if kind == "pong":
                    continue
                await backend.send(data if kind == "binary" else data.decode("utf-8", "replace"))
        except Exception:
            pass
        finally:
            try:
                await backend.close()
            except Exception:
                pass

    async def backend_to_client():
        try:
            async for message in backend:
                if isinstance(message, str):
                    frame = ws_encode(0x1, message.encode("utf-8"))
                else:
                    frame = ws_encode(0x2, message)
                writer.write(frame)
                await writer.drain()
        except Exception:
            pass
        finally:
            try:
                writer.write(ws_encode(0x8, b""))        # close frame to client
                await writer.drain()
            except Exception:
                pass

    await asyncio.gather(client_to_backend(), backend_to_client())


# ──────────────────────── connection dispatch ──────────────────────────
async def handle_connection(reader, writer):
    peer = writer.get_extra_info("peername")
    try:
        parsed = await read_http_head(reader)
        if parsed is None:
            return
        method, target, _version, headers = parsed

        token, rest = split_token(target)
        target_info = resolve_token(token)
        if target_info is None:
            # Unknown/malformed token — refuse (this is the anti-SSRF gate).
            upgrade = (header_get(headers, "upgrade") or "").lower()
            if "websocket" in upgrade:
                # can't send a 403 body meaningfully on a ws upgrade attempt
                await send_simple(writer, 403, "Forbidden", "invalid token")
            else:
                await send_simple(writer, 403, "Forbidden", "invalid token")
            return

        scheme, host, port = target_info
        prefix = f"{BROWSER_PREFIX}/{token}"

        upgrade = (header_get(headers, "upgrade") or "").lower()
        connection = (header_get(headers, "connection") or "").lower()
        if "websocket" in upgrade and "upgrade" in connection:
            await proxy_ws(reader, writer, headers, rest, scheme, host, port)
        else:
            body = await read_body(reader, headers)
            await proxy_http(writer, method, rest, headers, body,
                             scheme, host, port, prefix)
    except (ConnectionResetError, BrokenPipeError):
        pass
    except Exception as exc:
        log(f"connection error from {peer}: {exc!r}")
        try:
            await send_simple(writer, 500, "Internal Server Error", "proxy error")
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def main():
    server = await asyncio.start_server(handle_connection, LISTEN_HOST, LISTEN_PORT)
    log(f"http+ws proxy on {LISTEN_HOST}:{LISTEN_PORT}  tokens={TOKEN_DIR}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
