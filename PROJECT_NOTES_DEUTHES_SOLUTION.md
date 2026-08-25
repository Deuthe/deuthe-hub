# Deuthe's Solution: Automated WSA Provisioning, Multi-Session Sandboxing & Cloud Licensing Engine

**Author:** Kevin Guzman (Deuthe)  
**Domain:** [deuthe.com](https://deuthe.com) | [api.deuthe.com](https://api.deuthe.com)  
**Date:** August 2026  
**Category:** Systems Architecture &bull; Android Virtualization &bull; Reverse Engineering &bull; Cloud Infrastructure &bull; Anti-Piracy Protection  

---

## 1. Executive Summary

**Deuthe's Solution** is an end-to-end automation and software distribution ecosystem designed for Windows 11. It allows gamers and power users to run up to 8 isolated, simultaneous multi-account instances of mobile games (specifically Ankama's *DOFUS Touch*) natively on Windows through the Windows Subsystem for Android (WSA), bypassing traditional emulator performance overheads.

The project encompasses the entire software lifecycle:
1. **Low-Level Virtualization Automation:** Silent unattended installation and configuration of Windows Hyper-V, Virtual Machine Platform, and WSA with Google Services (MindTheGapps/KernelSU).
2. **Dynamic Android Package (APK) Reverse Engineering:** Automatic decompilation, AndroidManifest transformation, package identifier rewriting, and cryptographic resigning for multi-app coexistence.
3. **Session & OAuth Token Isolation:** Engineering a fix for Android Custom Tabs / Chrome WebView token contamination across clones.
4. **Binary Protection & In-Memory Execution:** C# .NET native compilation with in-memory AES-256 decryption, preventing code tampering or script extraction.
5. **Zero-Trust Cloud Licensing Architecture:** A self-hosted Python FastAPI backend with SQLite, connected to the internet through Cloudflare Zero Trust Tunnels with automatic SSL and Hardware ID (HWID) device binding.

---

## 2. Technical Architecture & Component Breakdown

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    CLIENT MACHINE                       │
                    │                                                         │
                    │  [ DeutheSetup.exe (SFX Archive) ]                      │
                    │       │                                                 │
                    │       ▼                                                 │
                    │  [ DeutheLauncher.exe (Compiled C# x64) ]               │
                    │       │                                                 │
                    │       ├── 1. Reads Hardware UUID (HWID)                 │
                    │       ├── 2. Queries api.deuthe.com/api/verify ─────────┼──────────┐
                    │       └── 3. In-Memory AES-256 Decryption (RAM Only)    │          │
                    │               │                                         │          │
                    │               ▼                                         │          │
                    │       [ WSA Core Provisioning & ADB Engine ]            │          │
                    │               │                                         │          │
                    │               ├── Install WSA Subsystem                 │          │
                    │               ├── Install Google Chrome (Auth Isolation)│          │
                    │               └── Decompile, Rewrite & Clone APKs       │          │
                    │                                                         │          │
                    └─────────────────────────────────────────────────────────┘          │
                                                                                         │ HTTPS
                                                                                         │ (TLS 1.3)
                    ┌─────────────────────────────────────────────────────────┐          │
                    │                CLOUD INFRASTRUCTURE                     │          │
                    │                                                         │          │
                    │  [ Cloudflare Edge Network ] (api.deuthe.com) ◄─────────┼──────────┘
                    │       │                                                 │
                    │       ▼ (Encrypted Cloudflare Tunnel)                   │
                    │  [ Ubuntu NUC Home Server (deuthe-nuc) ]                │
                    │       │                                                 │
                    │       ├── cloudflared daemon (Named Tunnel)             │
                    │       ├── FastAPI Licensing Service (Port 8000)         │
                    │       └── SQLite Database (licenses.db - HWID Tracking) │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘
```

---

## 3. Engineering Challenges & Solutions

### Challenge 1: The OAuth Token Conflict Bug
* **Problem:** When launching multiple cloned Dofus Touch instances, logging into Account #2 would immediately disconnect Account #1 with an authorization token conflict error.
* **Root Cause:** Dofus Touch utilizes Android Custom Tabs for web-based OAuth authentication. Without a dedicated standalone browser package (Google Chrome) installed inside WSA, all clones defaulted to a shared system WebView instance that reused session cookies and authentication tokens.
* **Solution:** Added automated pre-flight checks and silent ADB sideloading of Google Chrome inside WSA before cloning. Chrome creates isolated sandboxed storage contexts (`/data/data/com.ankama.dofustouch.[w/y/g/x]`), allowing each account to retain its independent auth token.

### Challenge 2: Dynamic APK Cloning & Split APK De-bundling
* **Problem:** Modern Android games are distributed as App Bundles (`.apkm` / split APKs) that cannot be installed with a simple package rename.
* **Solution:**
  * Script extracts base and configuration splits using 7-Zip.
  * Uses `apktool` to decompile the manifest and resources.
  * Modifies `AndroidManifest.xml` (renames `package="com.ankama.dofustouch.w"`, updates authorities, strips split dependencies).
  * Rebuilds and cryptographically signs each clone using `uber-apk-signer` with self-signed v1/v2/v3 signatures.

### Challenge 3: Software Protection & Anti-Piracy (HWID Locking)
* **Problem:** Distributing plain-text PowerShell scripts allowed users to share licenses freely or remove verification checks.
* **Solution:**
  * **C# In-Memory Wrapper:** Created `Compile-Binary.ps1`, which compresses the installer script via GZip, encrypts it using AES-256, and compiles a native 64-bit Windows binary (`DeutheLauncher.exe`) using Microsoft's `csc.exe`.
  * **Zero Disk Persistence:** The script is decrypted strictly in memory and piped directly to an internal PowerShell Runspace without ever writing `.ps1` files to disk.
  * **HWID Fingerprinting:** The installer computes a unique machine signature using `(Get-CimInstance Win32_ComputerSystemProduct).UUID` and hardware serial numbers.

### Challenge 4: Secure Hybrid Cloud Architecture
* **Problem:** Needed a globally accessible license API without exposing the home server's public IP or modifying router NAT/firewalls.
* **Solution:**
  * Deployed a FastAPI backend on an Ubuntu 24.04 NUC managed via systemd (`deuthe-license.service`).
  * Connected the local port 8000 to Cloudflare Zero Trust via a persistent `cloudflared` tunnel.
  * Assigned the custom domain `api.deuthe.com` with automated Cloudflare Universal SSL certificates.

---

## 4. Technology Stack Summary

| Layer | Technologies Used |
|---|---|
| **Client UI & Installer** | WPF (XAML), PowerShell 5.1 / 7, C# (.NET Framework 4.8), Win32 API |
| **Virtualization & Android** | Windows Subsystem for Android (WSA), Hyper-V, ADB, KernelSU, MindTheGapps |
| **Reverse Engineering** | `apktool`, `uber-apk-signer`, Java JRE, XML Manifest Rewriting |
| **Backend & Licensing** | Python 3.12, FastAPI, Uvicorn, SQLite3, Systemd |
| **Cloud & Networking** | Cloudflare Zero Trust (Tunnels), Cloudflare DNS, Namecheap DNS, Tailscale CGNAT |
| **Frontend & Web** | Vanilla HTML5 / CSS3 (Dark Mode / Glassmorphism), GitHub Pages, Custom Domain CNAME |

---

## 5. End-to-End Business Workflow

1. **Client Acquisition:** Client visits [deuthe.com/products/dofustouchwsa/install](https://deuthe.com/products/dofustouchwsa/install).
2. **License Minting:** Admin generates a cryptographically random license key (`DEUTHE-XXXX-XXXX-XXXX`) via the web dashboard at [api.deuthe.com/admin](https://api.deuthe.com/admin).
3. **Download & Execution:** Client downloads `DeutheSetup.exe` (hosted via GitHub Releases), moves it to a dedicated folder, and runs it as administrator.
4. **HWID Binding:** On first run, the encrypted launcher contacts `https://api.deuthe.com/api/verify` with the client's HWID. The server binds the key to that machine.
5. **Automated Setup:** The installer provisions WSA, installs Google Chrome, clones the desired number of accounts (1–8), and places desktop / Start Menu shortcuts ready to play.
