#!/usr/bin/env python3
"""
AzamLabs VPCS 8-Client Console Multiplexer (6.8.93 Upstream Parity)
- Up to 8 concurrent telnet/webconsole clients simultaneously.
- Keystrokes forwarded to VPCS backend; output broadcast to all active clients.
- Ctrl+C (\x03) terminates running ping/command globally across all clients.
- 9th client is informed 'Console is full (max 8 clients). Please try again later.' and closed cleanly.
- Zero-Trace Compliant.
"""

import sys
import os
import signal
import socket
import subprocess
import time
import select

MAX_CLIENTS = 8
FULL_MSG = b"\r\nConsole is full (max 8 clients). Please try again later.\r\n"
VPCS_REAL = "/opt/vpcsu/bin/vpcs.real"

def find_free_port(preferred):
    if preferred <= 65530:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', preferred))
                return preferred
            except OSError:
                pass
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def main():
    argv = list(sys.argv[1:])
    port = None
    for i, a in enumerate(argv):
        if a == "-p" and i + 1 < len(argv):
            try:
                port = int(argv[i + 1])
            except ValueError:
                pass
            break

    if port is None:
        # Pass through directly if not a console server invocation
        real_bin = VPCS_REAL if os.path.exists(VPCS_REAL) else "/opt/vpcsu/bin/vpcs"
        if not os.path.exists(real_bin):
            print("PNetLab VPCS Console Multiplexer")
            print("Usage: pnet-vpcs-mux.py -p <listen_port> [vpcs_options...]")
            sys.exit(0)
        os.execv(real_bin, [real_bin] + argv)

    # Internal port for the underlying VPCS process
    internal_port = find_free_port(port + 20000)

    # Rewrite -p argument for the real VPCS binary
    sub_argv = []
    skip_next = False
    for i, a in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if a == "-p":
            sub_argv.extend(["-p", str(internal_port)])
            skip_next = True
        else:
            sub_argv.append(a)

    real_bin = VPCS_REAL if os.path.exists(VPCS_REAL) else "/opt/vpcsu/bin/vpcs"
    session_id = "1"
    for i, a in enumerate(argv):
        if a == "-m" and i + 1 < len(argv):
            session_id = argv[i + 1]
            break

    # If invoked from a valid UNetLab node workspace, keep the node workspace as cwd
    # so startup.vpc is loaded and saved cleanly.
    cur_cwd = os.getcwd()
    sub_cwd = cur_cwd if (os.path.isdir(cur_cwd) and os.access(cur_cwd, os.W_OK) and cur_cwd not in ("/", "/root")) else f"/tmp/vpcs_session_{session_id}"
    try:
        os.makedirs(sub_cwd, mode=0o777, exist_ok=True)
        os.chmod(sub_cwd, 0o777)
    except Exception:
        pass

    child = subprocess.Popen([real_bin] + sub_argv, cwd=sub_cwd)

    # Setup listener for up to 8 concurrent clients
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(('0.0.0.0', port))
    listener.listen(16)
    listener.setblocking(False)

    clients = [] # list of client sockets
    backend_sock = None
    recent_buffer = bytearray()
    max_buf = 4096

    def cleanup(sig=None, frame=None):
        try:
            if child.poll() is None:
                child.terminate()
        except Exception:
            pass
        for c in clients:
            try:
                c.close()
            except Exception:
                pass
        if backend_sock:
            try:
                backend_sock.close()
            except Exception:
                pass
        try:
            listener.close()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    def connect_backend():
        nonlocal backend_sock
        for _ in range(30):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect(('127.0.0.1', internal_port))
                s.setblocking(False)
                backend_sock = s
                return True
            except (OSError, ConnectionRefusedError):
                time.sleep(0.05)
        return False

    while True:
        if child.poll() is not None:
            cleanup()

        # Connect to backend if not connected yet
        if backend_sock is None:
            connect_backend()

        rlist = [listener] + clients
        if backend_sock:
            rlist.append(backend_sock)

        try:
            readable, _, exceptional = select.select(rlist, [], rlist, 0.5)
        except (select.error, OSError):
            continue

        for s in readable:
            if s is listener:
                try:
                    conn, addr = listener.accept()
                except OSError:
                    continue

                if len(clients) >= MAX_CLIENTS:
                    try:
                        conn.sendall(FULL_MSG)
                        conn.shutdown(socket.SHUT_WR)
                    except Exception:
                        pass
                    finally:
                        conn.close()
                else:
                    conn.setblocking(False)
                    clients.append(conn)
                    # Feed recent buffer so client gets live prompt immediately
                    if recent_buffer:
                        try:
                            conn.sendall(bytes(recent_buffer))
                        except Exception:
                            pass
            elif s is backend_sock:
                try:
                    data = backend_sock.recv(4096)
                    if not data:
                        # Backend exited
                        cleanup()
                    recent_buffer.extend(data)
                    if len(recent_buffer) > max_buf:
                        recent_buffer = recent_buffer[-max_buf:]
                    # Broadcast to all active clients
                    dead_clients = []
                    for c in clients:
                        try:
                            c.sendall(data)
                        except Exception:
                            dead_clients.append(c)
                    for dc in dead_clients:
                        if dc in clients:
                            clients.remove(dc)
                            try:
                                dc.close()
                            except Exception:
                                pass
                except (OSError, ConnectionResetError):
                    cleanup()
            else:
                # Keystroke / command from a client
                try:
                    cdata = s.recv(1024)
                    if not cdata:
                        clients.remove(s)
                        s.close()
                        continue
                    # Forward to backend VPCS
                    if backend_sock:
                        try:
                            # Forward all bytes, including \x03 (Ctrl+C) to cancel running ping
                            backend_sock.sendall(cdata)
                        except Exception:
                            pass
                except (OSError, ConnectionResetError):
                    if s in clients:
                        clients.remove(s)
                    try:
                        s.close()
                    except Exception:
                        pass

        for s in exceptional:
            if s in clients:
                clients.remove(s)
            try:
                s.close()
            except Exception:
                pass

if __name__ == "__main__":
    main()

