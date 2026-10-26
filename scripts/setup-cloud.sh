#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p /workspace/tools
if [[ ! -x /workspace/tools/jdk21/bin/javac ]]; then
  docker pull eclipse-temurin:21-jdk@sha256:23cc5734ff46e776f51ce66eb9ee08444fd47caabec0a95b7eb6e94be2d3696d
  temporary_container=$(docker create eclipse-temurin:21-jdk@sha256:23cc5734ff46e776f51ce66eb9ee08444fd47caabec0a95b7eb6e94be2d3696d)
  trap 'docker rm "$temporary_container" >/dev/null' EXIT
  docker cp "$temporary_container:/opt/java/openjdk" /workspace/tools/jdk21
  docker rm "$temporary_container" >/dev/null
  trap - EXIT
fi
if [[ ! -x /workspace/tools/apache-maven-3.9.11/bin/mvn ]]; then
  staging=$(mktemp -d)
  curl -fsSL https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.tar.gz -o "$staging/maven.tar.gz"
  curl -fsSL https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.tar.gz.sha512 -o "$staging/maven.sha512"
  python3 - "$staging" <<'PY'
import sys,hashlib,pathlib
p=pathlib.Path(sys.argv[1]);assert hashlib.sha512((p/'maven.tar.gz').read_bytes()).hexdigest()==(p/'maven.sha512').read_text().strip()
PY
  tar -xzf "$staging/maven.tar.gz" -C /workspace/tools
  rm -r "$staging"
fi
python3 - <<'PY'
import os,urllib.parse,pathlib,xml.etree.ElementTree as E
root=E.Element('settings');E.SubElement(root,'localRepository').text='/workspace/.m2/repository'
u=urllib.parse.urlsplit(os.environ.get('HTTPS_PROXY',''))
if u.hostname:
 if u.username or u.password: raise SystemExit('Authenticated proxy requires secure external Maven settings; credentials must not be saved.')
 proxy=E.SubElement(E.SubElement(root,'proxies'),'proxy')
 for k,v in dict(id='cloud',active='true',protocol='http',host=u.hostname,port=str(u.port or 80),nonProxyHosts='localhost|127.0.0.1').items():E.SubElement(proxy,k).text=v
E.ElementTree(root).write('/workspace/tools/maven-settings.xml',encoding='unicode')
PY
npm ci --prefix frontend --cache /workspace/.npm-cache --no-audit --no-fund
docker compose up -d --wait
(cd backend && ../scripts/mvn -B verify)
npm run build --prefix frontend
