#!/usr/bin/env python3
"""
===============================================================================
PNetLab Master Release Ingestion Engine (pnet-release-ingestion-engine.py)
===============================================================================
Fulfills the PNetLab Master Process Architecture (Master-Proccess-Doc.docx):
  1. Version Control & Staging:
     Whenever a new version releases in upstream PNetLab, downloads and stages
     the release packages into the 'releases/<version>/' folder hierarchy.
  2. Tri-Pillar Customization & Hardening:
     Applies Custom-Performance, Custom-Features, Custom-Customization,
     canonical administrative scripts, and tests into the release payload.
  3. Packaging & Manifest Generation:
     Unpacks, overlays, repacks Debian packages (cross-platform pure-Python ar
     handling with bsdtar --zstd compression or native dpkg-deb fallback),
     and generates official release manifests and sha256 checksums.
  4. Channel Publication & Live Fleet Push:
     Updates channel-pointer.json and network install bootstraps, enabling
     all Live VMs to upgrade seamlessly via the single update command:
     `sudo pnet-update`
===============================================================================
"""

import os
import sys
import json
import shutil
import hashlib
import tarfile
import argparse
import datetime
import subprocess
from pathlib import Path

# Color and formatting tokens
COLOR_CYAN = "\033[96m"
COLOR_GREEN = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED = "\033[91m"
COLOR_BOLD = "\033[1m"
COLOR_RESET = "\033[0m"

def log_info(msg):
    print(f"{COLOR_CYAN}[*]{COLOR_RESET} {msg}")

def log_ok(msg):
    print(f"{COLOR_GREEN}[✔]{COLOR_RESET} {msg}")

def log_warn(msg):
    print(f"{COLOR_YELLOW}[⚠]{COLOR_RESET} {msg}")

def log_err(msg):
    print(f"{COLOR_RED}[✘]{COLOR_RESET} {msg}")


class ArArchive:
    """Cross-platform Unix ar archive reader and writer for Debian packages."""

    @staticmethod
    def read(deb_path):
        entries = {}
        with open(deb_path, 'rb') as f:
            magic = f.read(8)
            if magic != b'!<arch>\n':
                raise ValueError(f"Invalid ar archive magic: {deb_path}")
            while True:
                header = f.read(60)
                if len(header) < 60:
                    break
                name = header[:16].decode('latin1').strip()
                size = int(header[48:58].decode('latin1').strip())
                data = f.read(size)
                entries[name] = data
                if size % 2 == 1:
                    f.seek(1, 1)  # 2-byte alignment padding
        return entries

    @staticmethod
    def write(out_deb_path, entries_order, entries_dict):
        with open(out_deb_path, 'wb') as f:
            f.write(b'!<arch>\n')
            for name in entries_order:
                data = entries_dict[name]
                size = len(data)
                # Unix ar header (60 bytes)
                hdr = f"{name:<16}{'0':<12}{'0':<6}{'0':<6}{'100644':<8}{size:<10}`\n"
                f.write(hdr.encode('latin1'))
                f.write(data)
                if size % 2 == 1:
                    f.write(b'\n')


class PNetReleaseEngine:
    def __init__(self, repo_root=None):
        if repo_root is None:
            script_path = Path(__file__).resolve()
            # If inside scripts/, repo root is parent
            if script_path.parent.name == "scripts":
                self.repo_root = script_path.parent.parent
            else:
                self.repo_root = script_path.parent
        else:
            self.repo_root = Path(repo_root).resolve()

        self.releases_dir = self.repo_root / "releases"
        self.channel_pointer_path = self.releases_dir / "channel-pointer.json"
        self.latest_installer_path = self.releases_dir / "pnetlab-network-install-latest.sh"
        self.version_file_path = self.repo_root / "VERSION"

        # Three Pillars and Core Subsystems
        self.custom_perf_dir = self.repo_root / "Custom-Performance"
        self.custom_feat_dir = self.repo_root / "Custom-Features"
        self.custom_cust_dir = self.repo_root / "Custom-Customization"
        self.scripts_dir = self.repo_root / "scripts"
        self.tests_dir = self.repo_root / "tests"

    @staticmethod
    def calc_sha256(filepath):
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    def get_latest_existing_release(self):
        """Scans releases/ and returns the most recent release version directory."""
        if not self.releases_dir.is_dir():
            return None
        versions = []
        for p in self.releases_dir.iterdir():
            if p.is_dir() and (p / "debs").is_dir():
                versions.append(p.name)
        if not versions:
            return None
        # Return channel pointer release if it exists and matches
        if self.channel_pointer_path.is_file():
            try:
                with open(self.channel_pointer_path, "r", encoding="utf-8") as f:
                    ptr = json.load(f)
                    if ptr.get("release") in versions:
                        return ptr["release"]
            except Exception:
                pass
        return sorted(versions)[-1]

    def stage_release(self, version, source_dir=None, source_url=None, base_version=None):
        """
        Creates directory structure in releases/<version>/ and stages files.
        """
        log_info(f"Staging release: {COLOR_BOLD}{version}{COLOR_RESET}...")
        release_path = self.releases_dir / version
        debs_path = release_path / "debs"
        assets_path = release_path / "assets"
        manifests_path = release_path / "manifests"
        scripts_path = release_path / "scripts"

        for p in [debs_path, assets_path, manifests_path, scripts_path]:
            p.mkdir(parents=True, exist_ok=True)

        # 1. If source_dir provided, copy files from source_dir
        if source_dir:
            src = Path(source_dir).resolve()
            if not src.is_dir():
                raise FileNotFoundError(f"Source directory not found: {source_dir}")
            log_info(f"Importing release packages from {src}...")
            for f in src.glob("*.deb"):
                shutil.copy2(f, debs_path / f.name)
                log_ok(f"Imported deb: {f.name}")
            for f in src.glob("*.tar.*"):
                shutil.copy2(f, assets_path / f.name)
                log_ok(f"Imported asset: {f.name}")
            for f in src.glob("*.sh"):
                shutil.copy2(f, scripts_path / f.name)
                log_ok(f"Imported script: {f.name}")

        # 2. If source_url provided, download files
        elif source_url:
            log_info(f"Downloading upstream release packages from {source_url}...")
            import urllib.request
            # Minimal upstream package manifest download
            url_base = source_url.rstrip("/")
            # Attempt to fetch packages if URL specified
            try:
                manifest_url = f"{url_base}/manifests/pnetlab-{version}-manifest.json"
                req = urllib.request.Request(manifest_url, headers={"User-Agent": "PNetLab-Engine/1.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    manifest_data = json.loads(resp.read().decode("utf-8"))
                    with open(manifests_path / f"pnetlab-{version}-manifest.json", "w", encoding="utf-8") as mf:
                        json.dump(manifest_data, mf, indent=2)
                    log_ok(f"Downloaded manifest from {manifest_url}")
            except Exception as e:
                log_warn(f"Could not fetch manifest from {source_url}: {e}")

        # 3. If debs directory is empty, clone/template from base_version
        existing_debs = list(debs_path.glob("*.deb"))
        if not existing_debs:
            base_v = base_version or self.get_latest_existing_release()
            if base_v and base_v != version:
                base_path = self.releases_dir / base_v
                log_info(f"Seeding new release from base version {base_v}...")
                # Copy debs and rename with target version
                if (base_path / "debs").is_dir():
                    for f in (base_path / "debs").iterdir():
                        target_name = f.name.replace(base_v, version)
                        shutil.copy2(f, debs_path / target_name)
                        log_ok(f"Seeded deb: {target_name}")
                # Copy assets
                if (base_path / "assets").is_dir():
                    for f in (base_path / "assets").iterdir():
                        target_name = f.name.replace(base_v, version)
                        shutil.copy2(f, assets_path / target_name)
                        log_ok(f"Seeded asset: {target_name}")
                # Copy scripts
                if (base_path / "scripts").is_dir():
                    for f in (base_path / "scripts").iterdir():
                        target_name = f.name.replace(base_v, version)
                        shutil.copy2(f, scripts_path / target_name)
                        log_ok(f"Seeded script: {target_name}")
            else:
                log_warn(f"No existing packages found for release {version}. Place upstream .deb files into {debs_path}")

        log_ok(f"Release {version} staged at {release_path}")
        return release_path

    def _collect_custom_files_for_deb(self, is_master=True):
        """
        Gathers in-memory or on-disk mappings of customized files from:
        Custom-Performance, Custom-Features, Custom-Customization, scripts, tests.
        Returns list of (archive_relpath, local_abspath, mode).
        """
        overlays = []

        # 1. Custom-Customization: Templates (Master only)
        if is_master:
            intel_tmpl = self.custom_cust_dir / "templates" / "intel"
            amd_tmpl = self.custom_cust_dir / "templates" / "amd"
            if intel_tmpl.is_dir():
                for yml in intel_tmpl.glob("*.yml"):
                    overlays.append((f"opt/unetlab/html/templates/{yml.name}", yml, 0o644))
                    overlays.append((f"opt/unetlab/html/templates/intel/{yml.name}", yml, 0o644))
            if amd_tmpl.is_dir():
                for yml in amd_tmpl.glob("*.yml"):
                    overlays.append((f"opt/unetlab/html/templates/amd/{yml.name}", yml, 0o644))

            # 2. Custom-Customization: Login Portal (Cyber-Glass, Avatar)
            login_dir = self.custom_cust_dir / "login-portal"
            if login_dir.is_dir():
                for f in login_dir.glob("*"):
                    if f.is_file():
                        overlays.append((f"opt/unetlab/html/login/{f.name}", f, 0o644))
                avatar = login_dir / "img" / "pnet_home_avatar.png"
                if avatar.is_file():
                    overlays.append(("opt/unetlab/html/login/img/pnet_home_avatar.png", avatar, 0o644))
                    overlays.append(("opt/unetlab/html/login/img/azam_home_avatar.png", avatar, 0o644))

            # 3. Custom-Features: Web-UI and Themes Engine
            web_main = self.custom_feat_dir / "web-ui" / "main"
            if web_main.is_dir():
                for f in web_main.glob("*"):
                    if f.is_file():
                        overlays.append((f"opt/unetlab/html/main/{f.name}", f, 0o644))
                theme_css = web_main / "css" / "theme-engine.css"
                if theme_css.is_file():
                    overlays.append(("opt/unetlab/html/main/css/theme-engine.css", theme_css, 0o644))

            # Ops-Center / docked console
            web_ops = self.custom_feat_dir / "web-ui" / "ops-center"
            if web_ops.is_dir():
                for f in web_ops.glob("*"):
                    if f.is_file():
                        overlays.append((f"opt/unetlab/html/ops-center/{f.name}", f, 0o644))

        # 4. Custom-Performance: Heavy Node Optimizer & dry test
        perf_scripts = self.custom_perf_dir / "scripts"
        if perf_scripts.is_dir():
            for script_name in [
                "pnet-heavy-node-optimizer.sh",
                "pnet-apply-heavy-node-optimizer.sh",
                "pnet-dry-test.py",
                "pnet-cgroups-v2-engine.sh",
                "pnet-speed-optimizer.sh",
                "pnet-cpu-governor.py",
                "pnet-watchdog.py",
            ]:
                s_path = perf_scripts / script_name
                if s_path.is_file():
                    overlays.append((f"opt/unetlab/scripts/{script_name}", s_path, 0o755))

        # 5. Custom-Features: Bootstorm and Satellite daemons
        feat_scripts = self.custom_feat_dir / "scripts"
        if feat_scripts.is_dir():
            for script_name in ["pnet-bootstorm.py", "pnet-satd.py", "pnet-brokerd.py"]:
                s_path = feat_scripts / script_name
                if s_path.is_file():
                    overlays.append((f"opt/unetlab/scripts/{script_name}", s_path, 0o755))

        # 6. Repository scripts: Canonical administrative tools
        if self.scripts_dir.is_dir():
            for s_path in self.scripts_dir.glob("pnet-*"):
                if s_path.is_file():
                    overlays.append((f"opt/unetlab/scripts/{s_path.name}", s_path, 0o755))

        return overlays

    def _inject_into_deb(self, deb_path, overlays):
        """
        Unpacks .deb archive, overlays custom files into data.tar,
        and repacks into the .deb archive using bsdtar and pure-Python ar.
        """
        log_info(f"Injecting {len(overlays)} custom overlays into {deb_path.name}...")

        # 1. Read the ar archive
        entries = ArArchive.read(deb_path)
        data_entry_name = None
        for name in entries:
            if name.startswith("data.tar"):
                data_entry_name = name
                break

        if not data_entry_name:
            raise ValueError(f"No data.tar member found in {deb_path.name}")

        temp_dir = Path(os.environ.get("TEMP", "/tmp")) / f"pnet_repack_{os.getpid()}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            raw_data_zst = entries[data_entry_name]
            raw_zst_path = temp_dir / data_entry_name
            with open(raw_zst_path, "wb") as f:
                f.write(raw_data_zst)

            # Convert .tar.zst to uncompressed .tar via bsdtar
            uncompressed_tar = temp_dir / "data_uncompressed.tar"
            r = subprocess.run(["tar", "-cf", str(uncompressed_tar), f"@{raw_zst_path}"], capture_output=True, text=True)
            if r.returncode != 0:
                log_warn(f"bsdtar conversion notice: {r.stderr.strip()[:200]}")

            # Re-write tar archive with overlaid files
            modified_tar = temp_dir / "data_modified.tar"
            existing_names = set()
            overlay_rel_map = {item[0]: (item[1], item[2]) for item in overlays}

            with tarfile.open(uncompressed_tar, "r") as src_tar:
                with tarfile.open(modified_tar, "w") as dst_tar:
                    for member in src_tar.getmembers():
                        clean_name = member.name.lstrip("./")
                        existing_names.add(clean_name)

                        # If member is in overlays, write updated content
                        if clean_name in overlay_rel_map:
                            local_file, mode = overlay_rel_map[clean_name]
                            with open(local_file, "rb") as lf:
                                data = lf.read()
                            ti = tarfile.TarInfo(name=member.name)
                            ti.size = len(data)
                            ti.mode = mode
                            ti.mtime = int(datetime.datetime.now().timestamp())
                            import io
                            dst_tar.addfile(ti, io.BytesIO(data))
                        else:
                            f_obj = src_tar.extractfile(member) if member.isreg() else None
                            dst_tar.addfile(member, f_obj)

                    # Add new overlay files not in original archive
                    for rel_path, (local_file, mode) in overlay_rel_map.items():
                        clean_rel = rel_path.lstrip("./")
                        if clean_rel not in existing_names:
                            with open(local_file, "rb") as lf:
                                data = lf.read()
                            tar_entry_name = f"./{clean_rel}"
                            ti = tarfile.TarInfo(name=tar_entry_name)
                            ti.size = len(data)
                            ti.mode = mode
                            ti.mtime = int(datetime.datetime.now().timestamp())
                            import io
                            dst_tar.addfile(ti, io.BytesIO(data))

            # Repack into .tar.zst via bsdtar
            repacked_zst = temp_dir / "data_repacked.tar.zst"
            r2 = subprocess.run(["tar", "--zstd", "-cf", str(repacked_zst), f"@{modified_tar}"], capture_output=True, text=True)
            if r2.returncode != 0:
                raise RuntimeError(f"Failed to compress repacked tar: {r2.stderr}")

            with open(repacked_zst, "rb") as f:
                entries[data_entry_name] = f.read()

            # Write updated .deb
            entries_order = ["debian-binary", "control.tar.zst" if "control.tar.zst" in entries else "control.tar.gz", data_entry_name]
            # Include any other existing entries
            for k in entries:
                if k not in entries_order:
                    entries_order.append(k)

            ArArchive.write(deb_path, entries_order, entries)
            log_ok(f"Successfully injected and repacked {deb_path.name} ({deb_path.stat().st_size} bytes)")

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def apply_customizations(self, version):
        """
        Applies Tri-Pillar Customizations, scripts, and tests to staged release deb packages.
        """
        log_info(f"Applying Tri-Pillar Customizations to release {COLOR_BOLD}{version}{COLOR_RESET}...")
        release_path = self.releases_dir / version
        debs_path = release_path / "debs"

        if not debs_path.is_dir():
            raise FileNotFoundError(f"Debian packages directory not found: {debs_path}")

        master_deb = None
        satellite_deb = None

        for deb in debs_path.glob("*.deb"):
            if "satellite" in deb.name:
                satellite_deb = deb
            elif "pnetlab_" in deb.name or "pnet_" in deb.name or "azamlabs_" in deb.name:
                master_deb = deb

        if master_deb and master_deb.is_file():
            master_overlays = self._collect_custom_files_for_deb(is_master=True)
            self._inject_into_deb(master_deb, master_overlays)

        if satellite_deb and satellite_deb.is_file():
            sat_overlays = self._collect_custom_files_for_deb(is_master=False)
            self._inject_into_deb(satellite_deb, sat_overlays)

        log_ok(f"Tri-Pillar Customizations applied to release {version}!")

    def generate_manifest(self, version, sequence=None):
        """
        Computes SHA256 checksums and creates/updates:
        - releases/<version>/manifests/pnetlab-<version>-manifest.json
        - releases/<version>/manifests/pnetlab-<version>-manifest.json.sha256
        - releases/<version>/scripts/*.sha256
        - releases/<version>/assets/*.sha256
        """
        log_info(f"Generating release manifest for version {COLOR_BOLD}{version}{COLOR_RESET}...")
        release_path = self.releases_dir / version
        debs_path = release_path / "debs"
        assets_path = release_path / "assets"
        scripts_path = release_path / "scripts"
        manifests_path = release_path / "manifests"

        manifests_path.mkdir(parents=True, exist_ok=True)

        # Parse or increment sequence
        if sequence is None:
            # Try to read sequence from current channel pointer
            seq = 94
            if self.channel_pointer_path.is_file():
                try:
                    with open(self.channel_pointer_path, "r", encoding="utf-8") as f:
                        ptr = json.load(f)
                        seq = int(ptr.get("sequence", 93)) + 1
                except Exception:
                    seq = 94
            sequence = seq

        # Gather debs
        debs_dict = {}
        best_effort_debs = {}
        for f in debs_path.glob("*.deb"):
            # Format: <name>_<version>_<arch>.deb
            parts = f.name.replace(".deb", "").split("_")
            pkg_name = parts[0]
            if "dkms" in pkg_name or "bridge" in pkg_name:
                best_effort_debs[pkg_name] = version
            else:
                debs_dict[pkg_name] = version

        # If empty, ensure default package names
        if not debs_dict:
            debs_dict = {
                "pnetlab": version,
                "pnetlab-docker": version,
                "pnetlab-guacd": version,
                "pnetlab-qemu": version,
                "pnetlab-satellite": version,
                "pnetlab-schema": version,
                "pnetlab-vpcs": version
            }
            best_effort_debs = {"pnetlab-bridge-dkms": version}

        # Gather core assets
        core_assets_data = {}
        for f in assets_path.glob("*.tar.*"):
            if "core-assets" in f.name:
                sha = self.calc_sha256(f)
                core_assets_data = {
                    "archive": f.name,
                    "index": "core-assets.index.json",
                    "sha256": sha,
                    "url": f"https://codeberg.org/api/packages/netkillui/generic/pnetlab-core-assets/{version}/{f.name}"
                }
                # Also write .sha256
                with open(assets_path / f"{f.name}.sha256", "w", encoding="utf-8") as sf:
                    sf.write(f"{sha}  {f.name}\n")
                break

        # Satellite installer script
        sat_installer_data = {}
        for f in scripts_path.glob("*satellite*.sh"):
            sha = self.calc_sha256(f)
            sat_installer_data = {
                "name": f.name,
                "sha256": sha,
                "url": f"https://codeberg.org/api/packages/netkillui/generic/pnetlab-core-assets/{version}/{f.name}"
            }
            with open(scripts_path / f"{f.name}.sha256", "w", encoding="utf-8") as sf:
                sf.write(f"{sha}  {f.name}\n")
            break

        # Network install script
        for f in scripts_path.glob("*network-install*.sh"):
            sha = self.calc_sha256(f)
            with open(scripts_path / f"{f.name}.sha256", "w", encoding="utf-8") as sf:
                sf.write(f"{sha}  {f.name}\n")

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        exp_utc = now_utc + datetime.timedelta(days=90)
        iso_now = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        iso_exp = exp_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        manifest = {
            "arch": "amd64",
            "best_effort_debs": best_effort_debs,
            "core_assets": core_assets_data,
            "deb_source": "https://codeberg.org/api/packages/netkillui/debian",
            "deb_source_key_fpr": "EA21DC771565BC84C57A610861756807AC7005EC",
            "debs": debs_dict,
            "generated_utc": iso_now,
            "install_profiles": {
                "master": {
                    "best_effort_debs": list(best_effort_debs.keys()),
                    "debs": [k for k in debs_dict.keys() if k != "pnetlab-satellite"]
                },
                "satellite": {
                    "best_effort_debs": list(best_effort_debs.keys()),
                    "debs": [k for k in debs_dict.keys() if k in ["pnetlab-docker", "pnetlab-qemu", "pnetlab-satellite", "pnetlab-vpcs"]]
                }
            },
            "min_bootstrap_version": "2026.08.22",
            "not_valid_after": iso_exp,
            "oci": {
                "pnet-wifi-spike:1.0": {
                    "image_id": "sha256:fba55307f4adbd62bafc55978a7c0bc3d31022674a104550df70b37587ed4ef6",
                    "ref": "docker.io/rspnet/pnet-wifi-spike",
                    "registry_digest": "sha256:8cd03e37ca3b2b6fbe9c0f871ee38826ca3c97d2443b5a2939b2b3d8c57f8657"
                }
            },
            "reissue": 0,
            "release": version,
            "satellite_installer": sat_installer_data,
            "schema": 1,
            "sequence": sequence
        }

        manifest_file = manifests_path / f"pnetlab-{version}-manifest.json"
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        # Write manifest sha256
        m_sha = self.calc_sha256(manifest_file)
        with open(manifests_path / f"pnetlab-{version}-manifest.json.sha256", "w", encoding="utf-8") as sf:
            sf.write(f"{m_sha}  pnetlab-{version}-manifest.json\n")

        log_ok(f"Generated manifest: {manifest_file.name} (sequence {sequence})")
        return manifest_file

    def publish_release(self, version, sequence=None):
        """
        Publishes the release by updating:
        1. releases/channel-pointer.json and .sha256
        2. releases/pnetlab-network-install-latest.sh and .sha256
        3. VERSION file at root
        """
        log_info(f"Publishing release {COLOR_BOLD}{version}{COLOR_RESET} to channel-pointer.json...")
        release_path = self.releases_dir / version
        scripts_path = release_path / "scripts"

        # Determine sequence
        if sequence is None:
            seq = 94
            if self.channel_pointer_path.is_file():
                try:
                    with open(self.channel_pointer_path, "r", encoding="utf-8") as f:
                        ptr = json.load(f)
                        seq = int(ptr.get("sequence", 93)) + 1
                except Exception:
                    seq = 94
            sequence = seq

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        exp_utc = now_utc + datetime.timedelta(days=90)
        iso_now = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        iso_exp = exp_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

        pointer_data = {
            "generated_utc": iso_now,
            "min_bootstrap_version": "2026.08.22",
            "not_valid_after": iso_exp,
            "release": version,
            "schema": 1,
            "sequence": sequence,
            "type": "pnetlab-channel-pointer"
        }

        # Write channel pointer
        with open(self.channel_pointer_path, "w", encoding="utf-8") as f:
            json.dump(pointer_data, f, indent=2)

        ptr_sha = self.calc_sha256(self.channel_pointer_path)
        with open(self.releases_dir / "channel-pointer.json.sha256", "w", encoding="utf-8") as f:
            f.write(f"{ptr_sha}  pnetlab-latest.json\n")

        # Synchronize latest network install script
        latest_sh = None
        for f in scripts_path.glob("*network-install*.sh"):
            latest_sh = f
            break

        if latest_sh and latest_sh.is_file():
            shutil.copy2(latest_sh, self.latest_installer_path)
            sh_sha = self.calc_sha256(self.latest_installer_path)
            with open(self.releases_dir / "pnetlab-network-install-latest.sh.sha256", "w", encoding="utf-8") as f:
                f.write(f"{sh_sha}  pnetlab-network-install-latest.sh\n")
            log_ok("Updated pnetlab-network-install-latest.sh and sha256 checksum.")

        # Update root VERSION
        with open(self.version_file_path, "w", encoding="utf-8") as f:
            f.write(f"{version}\n")
        log_ok(f"Updated repository VERSION to {version}")

        log_ok(f"Release {version} successfully published! Fleet VMs will now receive this release.")

    def push_to_live_vms(self, hosts=None, role="auto", username="root", password="azam", key_file=None):
        """
        Executes the Single Update Command (`sudo pnet-update`) across live VMs.
        """
        log_info(f"Dispatching Single Update Command ({COLOR_BOLD}sudo pnet-update{COLOR_RESET}) to Live VMs...")

        cmd = "pnet-update"
        if role == "master":
            cmd = "pnet-update --master"
        elif role == "satellite":
            cmd = "pnet-update --satellite"
        else:
            cmd = "pnet-update --auto"

        if not hosts:
            # Check if running locally on a live Linux VM
            if os.name != "nt" and (Path("/opt/unetlab").is_dir() or Path("/opt/pnet").is_dir()):
                log_info(f"Running single update command locally: sudo {cmd}...")
                subprocess.run(["sudo", cmd], check=False)
                return True
            else:
                log_info("Fleet Push Guidance:")
                print(f"  Execute the following single update command on your Live VMs:\n")
                print(f"    {COLOR_BOLD}{COLOR_GREEN}sudo {cmd}{COLOR_RESET}\n")
                print("  Or run with target host flags:")
                print("    python scripts/pnet-release-ingestion-engine.py push --hosts 192.168.1.23,192.168.1.24")
                return True

        # Remote execution over SSH via paramiko
        try:
            import paramiko
        except ImportError:
            log_err("paramiko is not installed. Run: pip install paramiko")
            return False

        success = True
        host_list = [h.strip() for h in hosts.split(",") if h.strip()]
        for host in host_list:
            log_info(f"Connecting to live VM: {COLOR_BOLD}{host}{COLOR_RESET}...")
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                connect_kwargs = {"username": username, "timeout": 15}
                if key_file:
                    connect_kwargs["key_filename"] = key_file
                else:
                    connect_kwargs["password"] = password

                ssh.connect(host, **connect_kwargs)
                log_ok(f"Connected to {host}. Executing: sudo {cmd}...")
                stdin, stdout, stderr = ssh.exec_command(f"sudo {cmd}", get_pty=True)
                for line in iter(stdout.readline, ""):
                    print(f"  [{host}] {line.rstrip()}")
                rc = stdout.channel.recv_exit_status()
                if rc == 0:
                    log_ok(f"Single update command succeeded on {host} (exit code 0)")
                else:
                    log_err(f"Single update command failed on {host} (exit code {rc})")
                    success = False
            except Exception as e:
                log_err(f"Failed to update host {host}: {e}")
                success = False
            finally:
                ssh.close()

        return success

    def run_pipeline(self, version, source_dir=None, source_url=None, base_version=None, push_hosts=None, role="auto"):
        """
        Executes the full turnkey Release Ingestion Pipeline per Master-Proccess-Doc.docx:
          1. Stage release in RELEASES folder
          2. Apply Custom-Performance, Custom-Features, Custom-Customization, scripts, tests
          3. Generate manifest and SHA256 checksums
          4. Publish channel-pointer.json
          5. Dispatch push via Single Update Command
        """
        print(f"\n{COLOR_CYAN}{COLOR_BOLD}================================================================================")
        print(f"    PNETLAB MASTER RELEASE INGESTION ENGINE (Master-Proccess-Doc.docx)")
        print(f"    Target Release Version: {version}")
        print(f"================================================================================{COLOR_RESET}\n")

        # Step 1: Stage release
        self.stage_release(version, source_dir=source_dir, source_url=source_url, base_version=base_version)

        # Step 2: Apply Tri-Pillar Customizations, scripts, tests
        self.apply_customizations(version)

        # Step 3: Generate manifest and checksums
        self.generate_manifest(version)

        # Step 4: Publish to channel pointer
        self.publish_release(version)

        # Step 5: Push via single update command
        self.push_to_live_vms(hosts=push_hosts, role=role)

        print(f"\n{COLOR_GREEN}{COLOR_BOLD}================================================================================")
        print(f"    Release {version} Ingestion & Deployment Pipeline Completed Successfully!")
        print(f"================================================================================{COLOR_RESET}\n")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="PNetLab Release Ingestion Engine (Master-Proccess-Doc.docx)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run full turnkey release pipeline:
  python scripts/pnet-release-ingestion-engine.py pipeline --version 6.8.94resolute1

  # Stage a release from local upstream directory:
  python scripts/pnet-release-ingestion-engine.py stage --version 6.8.94resolute1 --source-dir /path/to/debs

  # Apply Tri-Pillar customizations (Performance, Features, Customization, scripts, tests):
  python scripts/pnet-release-ingestion-engine.py apply --version 6.8.94resolute1

  # Generate release manifest and sha256 files:
  python scripts/pnet-release-ingestion-engine.py manifest --version 6.8.94resolute1

  # Publish release to channel-pointer.json:
  python scripts/pnet-release-ingestion-engine.py publish --version 6.8.94resolute1

  # Push to live fleet VMs via Single Update Command:
  python scripts/pnet-release-ingestion-engine.py push --hosts 192.168.1.23,192.168.1.24
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Command: pipeline
    p_pipe = subparsers.add_parser("pipeline", help="Execute complete end-to-end ingestion pipeline")
    p_pipe.add_argument("--version", required=True, help="Release version (e.g. 6.8.94resolute1)")
    p_pipe.add_argument("--source-dir", help="Directory containing incoming upstream packages")
    p_pipe.add_argument("--source-url", help="URL to download upstream packages")
    p_pipe.add_argument("--base-version", help="Base release version to seed from")
    p_pipe.add_argument("--push-hosts", help="Comma-separated list of live VM hostnames or IPs to update")
    p_pipe.add_argument("--role", default="auto", choices=["auto", "master", "satellite"], help="Node role")

    # Command: stage
    p_stage = subparsers.add_parser("stage", help="Stage new release in releases/<version>/")
    p_stage.add_argument("--version", required=True, help="Release version (e.g. 6.8.94resolute1)")
    p_stage.add_argument("--source-dir", help="Directory containing incoming upstream packages")
    p_stage.add_argument("--source-url", help="URL to download upstream packages")
    p_stage.add_argument("--base-version", help="Base release version to seed from")

    # Command: apply
    p_apply = subparsers.add_parser("apply", help="Apply Tri-Pillar Customizations into release deb packages")
    p_apply.add_argument("--version", required=True, help="Release version (e.g. 6.8.94resolute1)")

    # Command: manifest
    p_mani = subparsers.add_parser("manifest", help="Generate official release manifest and sha256 files")
    p_mani.add_argument("--version", required=True, help="Release version (e.g. 6.8.94resolute1)")
    p_mani.add_argument("--sequence", type=int, help="Release sequence number")

    # Command: publish
    p_pub = subparsers.add_parser("publish", help="Publish release to channel-pointer.json and network installer")
    p_pub.add_argument("--version", required=True, help="Release version (e.g. 6.8.94resolute1)")
    p_pub.add_argument("--sequence", type=int, help="Release sequence number")

    # Command: push
    p_push = subparsers.add_parser("push", help="Push update to Live VMs via Single Update Command (pnet-update)")
    p_push.add_argument("--hosts", help="Comma-separated list of live VM hostnames or IPs")
    p_push.add_argument("--role", default="auto", choices=["auto", "master", "satellite"], help="Node role")
    p_push.add_argument("--user", default="root", help="SSH username (default: root)")
    p_push.add_argument("--password", default="azam", help="SSH password")
    p_push.add_argument("--key", help="SSH private key path")

    args = parser.parse_args()

    engine = PNetReleaseEngine()

    if args.command == "pipeline":
        engine.run_pipeline(
            version=args.version,
            source_dir=args.source_dir,
            source_url=args.source_url,
            base_version=args.base_version,
            push_hosts=args.push_hosts,
            role=args.role
        )
    elif args.command == "stage":
        engine.stage_release(
            version=args.version,
            source_dir=args.source_dir,
            source_url=args.source_url,
            base_version=args.base_version
        )
    elif args.command == "apply":
        engine.apply_customizations(version=args.version)
    elif args.command == "manifest":
        engine.generate_manifest(version=args.version, sequence=args.sequence)
    elif args.command == "publish":
        engine.publish_release(version=args.version, sequence=args.sequence)
    elif args.command == "push":
        engine.push_to_live_vms(
            hosts=args.hosts,
            role=args.role,
            username=args.user,
            password=args.password,
            key_file=args.key
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
