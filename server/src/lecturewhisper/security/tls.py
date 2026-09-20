"""TLS certificate and security helpers for Lecture Whisper."""

from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
import socket
import subprocess
from typing import List

TLS_DIR = Path.home() / ".lecturewhisper" / "tls"
CERT_PATH = TLS_DIR / "cert.pem"
KEY_PATH = TLS_DIR / "key.pem"


def get_address_candidates() -> List[str]:
    """Discover candidate IPv4 addresses for the host."""
    addresses: set[str] = set()
    hostname = socket.gethostname()
    try:
        for item in socket.gethostbyname_ex(hostname)[2]:
            if not item.startswith("127."):
                addresses.add(item)
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        addresses.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass

    try:
        import re
        out = subprocess.check_output(["ifconfig"], text=True)
        for ip in re.findall(r"inet\s+(\d+\.\d+\.\d+\.\d+)", out):
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                addresses.add(ip)
    except Exception:
        pass

    result = sorted(list(addresses))
    if "127.0.0.1" not in result:
        result.append("127.0.0.1")
    return result


def ensure_tls_certificate() -> tuple[Path, Path]:
    """Ensure a self-signed TLS certificate and private key exist."""
    TLS_DIR.mkdir(parents=True, exist_ok=True)
    if CERT_PATH.exists() and KEY_PATH.exists():
        return CERT_PATH, KEY_PATH

    hostname = socket.gethostname()
    sans = ["DNS:localhost", f"DNS:{hostname}", "IP:127.0.0.1"]
    for ip in get_address_candidates():
        if ip != "127.0.0.1":
            sans.append(f"IP:{ip}")
    san_str = ",".join(sans)

    config_content = f"""[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = LectureWhisper

[v3_req]
subjectAltName = {san_str}
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
"""
    cnf_path = TLS_DIR / "openssl.cnf"
    cnf_path.write_text(config_content)

    cmd = [
        "openssl",
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        str(KEY_PATH),
        "-out",
        str(CERT_PATH),
        "-days",
        "730",
        "-nodes",
        "-config",
        str(cnf_path),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    finally:
        if cnf_path.exists():
            try:
                cnf_path.unlink()
            except Exception:
                pass

    return CERT_PATH, KEY_PATH


def get_cert_fingerprint_base64url() -> str:
    """Get SHA-256 fingerprint of the self-signed certificate in base64url format."""
    cert_path, _ = ensure_tls_certificate()
    cmd = ["openssl", "x509", "-in", str(cert_path), "-outform", "DER"]
    der = subprocess.run(cmd, check=True, capture_output=True).stdout
    sha256_der = hashlib.sha256(der).digest()
    return base64.urlsafe_b64encode(sha256_der).decode().rstrip("=")


def get_cert_fingerprint_hex() -> str:
    """Get SHA-256 fingerprint in hex format."""
    cert_path, _ = ensure_tls_certificate()
    cmd = ["openssl", "x509", "-in", str(cert_path), "-outform", "DER"]
    der = subprocess.run(cmd, check=True, capture_output=True).stdout
    return hashlib.sha256(der).hexdigest()
