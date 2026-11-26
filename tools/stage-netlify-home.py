"""Add JACKCITY to the static Netlify publish directory."""
import argparse
import re
from html import escape
from pathlib import Path
from shutil import copy2
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("publish", type=Path, help="Copy of the existing Netlify publish directory")
parser.add_argument("jackcity_web", type=Path, help="Directory made by prepare-web-player.sh")
parser.add_argument("player_url", nargs="?", help="HTTPS player endpoint from the streaming host")
parser.add_argument("--arcware-share-id", help="Arcware identifier for the embedded player")
parser.add_argument("--arcware-preview", action="store_true", help="Stage a link-only deploy preview")
args = parser.parse_args()
if args.arcware_share_id:
    if args.player_url or not re.fullmatch(
        r"share-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", args.arcware_share_id
    ):
        parser.error("Supply one valid Arcware share ID or an external HTTPS endpoint.")
    player_url = "/play-jackcity.html"
elif args.arcware_preview:
    if args.player_url:
        parser.error("The deploy preview takes its share ID from the test link.")
    player_url = "/play-jackcity.html"
elif args.player_url:
    url = urlsplit(args.player_url)
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        parser.error("Player endpoint must be a public HTTPS URL.")
    player_url = args.player_url
else:
    parser.error("An Arcware share ID or external HTTPS endpoint is required.")

original_home = args.publish / "index.html"
home = args.publish / ("jackcity-preview.html" if args.arcware_preview else "GTA/index.html")
assets = args.publish / "jackcity-assets"
files = ("landing.css", "landing.js", "title.png", "cover.webp", "opening.m4a")
if not original_home.is_file():
    parser.error("The existing portfolio index.html is required.")
if home.exists() or assets.exists():
    parser.error("The destination already has a JACKCITY page or assets. Use a clean copy.")
for name in files:
    if not (args.jackcity_web / name).is_file():
        parser.error(f"Prepared web asset missing: {name}")

landing = (args.jackcity_web / "index.html").read_text()
if 'href="./player.html"' not in landing:
    parser.error("Supply the default web build. The stream URL is set by this script.")
landing = landing.replace('href="./player.html"', f'href="{escape(player_url, quote=True)}"')
for name in files:
    landing = landing.replace(f'"./{name}"', f'"/jackcity-assets/{name}"')
landing = landing.replace(
    '</span></a>',
    '</span></a>\n      <a class="portfolio-link" href="/">View portfolio</a>',
    1,
)

assets.mkdir()
for name in files:
    copy2(args.jackcity_web / name, assets / name)
home.parent.mkdir(parents=True, exist_ok=True)
new_home = assets / "index.pending"
new_home.write_text(landing)
new_home.replace(home)
print(f"Prepared {home}.")

if args.arcware_share_id or args.arcware_preview:
    for name in ("arcware-player.css", "jackcity-touch.css"):
        copy2(args.jackcity_web / name, assets / name)
    player = (args.jackcity_web / "arcware-player.html").read_text()
    player = player.replace('href="/portfolio.html"', 'href="/"')
    (args.publish / "play-jackcity.html").write_text(
        player.replace("__ARCWARE_SHARE_ID__", args.arcware_share_id or "")
    )
