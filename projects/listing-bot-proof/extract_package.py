from __future__ import annotations

from pathlib import Path
import zipfile


def main() -> None:
    root = Path(__file__).resolve().parent
    with zipfile.ZipFile(root / "listing-package.zip") as archive:
        for name in ("listing.txt", "listing.json", "inventory-row.csv"):
            (root / name).write_bytes(archive.read(name))


if __name__ == "__main__":
    main()
