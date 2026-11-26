"""Stage JACKCITY on top of a copy of the existing static Netlify publish folder."""
import argparse
from html import escape
from pathlib import Path
from shutil import copy2
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("publish", type=Path, help="Copy of the existing Netlify publish directory")
parser.add_argument("jackcity_web", type=Path, help="Directory made by prepare-web-player.sh")
parser.add_argument("player_url", help="HTTPS player endpoint from the streaming host")
args = parser.parse_args()
url = urlsplit(args.player_url)
if url.scheme != "https" or not url.hostname or url.username or url.password:
    parser.error("Player endpoint must be a public HTTPS URL.")

home = args.publish / "index.html"
old_home = args.publish / "portfolio.html"
assets = args.publish / "jackcity-assets"
files = ("landing.css", "landing.js", "title.png", "cover.webp", "opening.m4a")
if not home.is_file():
    parser.error("The existing portfolio index.html is required.")
if old_home.exists() or assets.exists():
    parser.error("The destination already has portfolio.html or jackcity-assets. Use a clean copy.")
for name in files:
    if not (args.jackcity_web / name).is_file():
        parser.error(f"Prepared web asset missing: {name}")

landing = (args.jackcity_web / "index.html").read_text()
if 'href="./player.html"' not in landing:
    parser.error("Supply the default web build. The stream URL is set by this script.")
landing = landing.replace('href="./player.html"', f'href="{escape(args.player_url, quote=True)}"')
for name in files:
    landing = landing.replace(f'"./{name}"', f'"/jackcity-assets/{name}"')
landing = landing.replace(
    '</span></a>',
    '</span></a>\n      <a class="portfolio-link" href="/portfolio.html">View portfolio</a>',
    1,
)

assets.mkdir()
for name in files:
    copy2(args.jackcity_web / name, assets / name)
copy2(home, old_home)
new_home = assets / "index.pending"
new_home.write_text(landing)
new_home.replace(home)
print(f"Prepared {home}. Portfolio preserved at {old_home}.")
