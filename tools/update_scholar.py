#!/usr/bin/env python3
import os, sys, json, time, argparse
from datetime import datetime
from scholarly import scholarly
from tenacity import retry, wait_exponential, stop_after_attempt

def _safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

def _extract_url(fp):
    return (
        fp.get("pub_url")
        or fp.get("eprint_url")
        or fp.get("author_pub_url")
        or fp.get("pub_url_arxiv")
        or fp.get("pub_url_scholar")
        or fp.get("url_scholarbib")
        or "#"
    )

@retry(wait=wait_exponential(multiplier=1, max=60), stop=stop_after_attempt(6), reraise=True)
def _fetch_author_filled(scholar_id: str):
    a = scholarly.search_author_id(scholar_id)
    return scholarly.fill(a)

@retry(wait=wait_exponential(multiplier=1, max=30), stop=stop_after_attempt(5), reraise=True)
def _fill_pub(pub):
    return scholarly.fill(pub)

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--max", type=int, default=120, help="İşlenecek maksimum yayın sayısı.")
    p.add_argument("--out", type=str, default="assets/data/scholar_stats.json", help="JSON çıktı yolu.")
    p.add_argument("--quiet", action="store_true", help="Sessiz çıktı.")
    return p.parse_args()

def main():
    args = parse_args()

    scholar_id = os.environ.get("SCHOLAR_ID")
    if not scholar_id:
        print("HATA: SCHOLAR_ID environment değişkeni tanımlı değil.", file=sys.stderr)
        sys.exit(1)

    print("Scholar ID alındı (maskelenmiş).")

    try:
        author = _fetch_author_filled(scholar_id)
    except Exception as e:
        print(f"Error updating scholar stats: Cannot Fetch from Google Scholar. ({e})")
        sys.exit(1)

    pubs_all = author.get("publications", [])
    pubs_all.sort(key=lambda x: _safe_int(x.get("bib", {}).get("pub_year", 0)), reverse=True)
    pubs = pubs_all[:args.max] if args.max and args.max > 0 else pubs_all

    stats = {
        "citations": author.get("citedby", 0),
        "h_index": author.get("hindex", 0),
        "publications": len(pubs_all),
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "recent_publications": [],
    }

    for i, pub in enumerate(pubs):
        try:
            fp = _fill_pub(pub)
            bib = fp.get("bib", {})
            abstract = (
                bib.get("abstract")
                or fp.get("abstract")
                or fp.get("summary")
                or "Abstract not available"
            )
            pub_data = {
                "title": bib.get("title", "N/A"),
                "year": bib.get("pub_year", "Year Unknown"),
                "citation": bib.get("citation", "Citation not available"),
                "citations_count": fp.get("num_citations', 0) if False else fp.get("num_citations", 0),
                "abstract": abstract,
                "url": _extract_url(fp),
                "authors": bib.get("author", []),
            }
            if not args.quiet:
                print(f"- [{i+1}] {pub_data['title']} ({pub_data['year']}) — citations={pub_data['citations_count']}")
            stats["recent_publications"].append(pub_data)
            time.sleep(0.6)  # nazik gecikme (rate-limit'e karşı)
        except Exception as e:
            print(f"[WARN] Yayın işlenemedi: {e}")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"\nSuccessfully updated scholar stats → {args.out}")

if __name__ == "__main__":
    main()
