#!/usr/bin/env python3
"""PNetLab Backwards-Compatibility MCP Server entrypoint delegator."""
import os
import sys

_TARGET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pnet-mcp.py")
if __name__ == "__main__":
    if os.path.isfile(_TARGET):
        with open(_TARGET, "rb") as _f:
            exec(compile(_f.read(), _TARGET, "exec"))
    else:
        sys.stderr.write("azamlabs-mcp: target script pnet-mcp.py not found\n")
        sys.exit(1)
