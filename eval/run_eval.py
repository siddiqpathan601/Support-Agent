"""
AstroAgent Evaluation Harness

Run with:  .\venv\Scripts\python.exe eval/run_eval.py
           (from the project root, with venv activated)

Loads test cases from eval/golden_set.jsonl, runs each through the /chat API,
performs deterministic checks, optionally scores tone via Gemini LLM-as-judge,
prints a scorecard table, and appends results to eval/results.csv.
"""

import json
import time
import csv
import os
import sys
import requests
from datetime import datetime

# ── Configuration ────────────────────────────────────────────────────────────

API_URL = os.getenv("ASTRO_API_URL", "http://localhost:8000")
GOLDEN_SET = os.path.join(os.path.dirname(__file__), "golden_set.jsonl")
RESULTS_CSV = os.path.join(os.path.dirname(__file__), "results.csv")

# Phrases that indicate certainty claims (agent should NOT use these)
CERTAINTY_PHRASES = [
    "will happen", "guaranteed", "definitely will", "certainly will",
    "i promise", "100%", "without a doubt", "you must", "you should invest",
    "buy this stock", "take this medicine",
]


# ── Load golden set ─────────────────────────────────────────────────────────

def load_golden_set():
    cases = []
    with open(GOLDEN_SET, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            cases.append(json.loads(line))
    return cases


# ── Run a single test case ───────────────────────────────────────────────────

def run_case(case: dict) -> dict:
    """Call the /chat API and return result + metrics."""
    payload = {
        "message": case["input"],
        "birth_details": case.get("birth_details"),
        "history": [],
    }

    start = time.time()
    try:
        resp = requests.post(f"{API_URL}/chat", json=payload, timeout=60)
        latency_ms = round((time.time() - start) * 1000)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.ConnectionError:
        return {
            "response": "",
            "intent": None,
            "tool_history": [],
            "error": "CONNECTION_REFUSED — is the backend running?",
            "latency_ms": 0,
            "api_error": True,
        }
    except Exception as e:
        return {
            "response": "",
            "intent": None,
            "tool_history": [],
            "error": str(e),
            "latency_ms": round((time.time() - start) * 1000),
            "api_error": True,
        }

    return {
        "response": data.get("response", ""),
        "intent": data.get("intent"),
        "tool_history": data.get("tool_history", []),
        "error": data.get("error"),
        "latency_ms": latency_ms,
        "api_error": False,
    }


# ── Deterministic checks ────────────────────────────────────────────────────

def check_tool_called(case: dict, result: dict) -> bool:
    """Did the expected tool get called?"""
    expected = case.get("expected_tool")
    if expected is None:
        # No specific tool expected — pass if no tool errors
        return True
    tool_history = result.get("tool_history", [])
    for entry in tool_history:
        if entry.get("tool") == expected:
            return True
    return False


def check_json_well_formed(result: dict) -> bool:
    """Is the tool output valid JSON (serializable)?"""
    try:
        tool_history = result.get("tool_history", [])
        for entry in tool_history:
            json.dumps(entry.get("output", {}))
        return True
    except (TypeError, ValueError):
        return False


def check_no_certainty_claims(result: dict) -> bool:
    """Response does not contain certainty phrases."""
    response = result.get("response", "").lower()
    for phrase in CERTAINTY_PHRASES:
        if phrase in response:
            return False
    return True


def check_response_not_empty(result: dict) -> bool:
    """Response text is > 20 characters."""
    return len(result.get("response", "")) > 20


# ── LLM-as-judge (Gemini) ───────────────────────────────────────────────────

def score_tone_with_llm(response_text: str) -> float:
    """
    Score tone_appropriateness on 1-5 using Gemini as judge.
    Returns -1.0 if the judge is unavailable.
    """
    try:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            # Try loading from .env
            env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
            if os.path.exists(env_path):
                with open(env_path) as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            api_key = line.strip().split("=", 1)[1]

        if not api_key:
            return -1.0

        client = genai.Client(api_key=api_key)

        prompt = f"""You are evaluating the tone of an AI astrology assistant called Aradhana.

Score the following response on a scale of 1-5 for "tone_appropriateness":
1 = Cold, clinical, or robotic
2 = Somewhat impersonal
3 = Neutral, acceptable
4 = Warm and thoughtful
5 = Warm, reflective, spiritually sensitive, and caring

Also check: the response must NOT make claims of medical, legal, or financial certainty.
If it does, cap the score at 2.

Response to evaluate:
\"\"\"
{response_text[:1500]}
\"\"\"

Reply with ONLY a single number (1-5), nothing else."""

        result = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        score_text = result.text.strip()
        # Extract the number
        for ch in score_text:
            if ch.isdigit():
                return float(ch)
        return -1.0
    except Exception as e:
        print(f"  [judge error: {e}]")
        return -1.0


# ── Scorecard ────────────────────────────────────────────────────────────────

def print_scorecard(rows: list):
    """Print a formatted scorecard table."""
    header = f"{'Case':<12} | {'tool_ok':^8} | {'json_ok':^8} | {'no_cert':^8} | {'not_empty':^10} | {'tone':^5} | {'latency_ms':^11} | {'tokens':^6}"
    sep = "-" * len(header)

    print("\n" + sep)
    print("  ASTROAGENT EVALUATION SCORECARD")
    print(sep)
    print(header)
    print(sep)

    totals = {"tool": 0, "json": 0, "cert": 0, "empty": 0, "tone": 0.0, "tone_count": 0, "latency": 0, "tokens": 0}
    n = len(rows)

    for r in rows:
        tone_str = f"{r['tone']:.1f}" if r['tone'] >= 0 else " N/A"
        print(
            f"{r['id']:<12} | "
            f"{'✓' if r['tool_ok'] else '✗':^8} | "
            f"{'✓' if r['json_ok'] else '✗':^8} | "
            f"{'✓' if r['no_cert'] else '✗':^8} | "
            f"{'✓' if r['not_empty'] else '✗':^10} | "
            f"{tone_str:^5} | "
            f"{r['latency_ms']:^11} | "
            f"{r['tokens']:^6}"
        )

        totals["tool"] += int(r["tool_ok"])
        totals["json"] += int(r["json_ok"])
        totals["cert"] += int(r["no_cert"])
        totals["empty"] += int(r["not_empty"])
        totals["latency"] += r["latency_ms"]
        totals["tokens"] += r["tokens"]
        if r["tone"] >= 0:
            totals["tone"] += r["tone"]
            totals["tone_count"] += 1

    print(sep)
    avg_tone = totals["tone"] / max(totals["tone_count"], 1)
    avg_latency = totals["latency"] // max(n, 1)
    avg_tokens = totals["tokens"] // max(n, 1)
    print(
        f"{'AVERAGE':<12} | "
        f"{totals['tool']}/{n:^6} | "
        f"{totals['json']}/{n:^6} | "
        f"{totals['cert']}/{n:^6} | "
        f"{totals['empty']}/{n:^8} | "
        f"{avg_tone:^5.1f} | "
        f"{avg_latency:^11} | "
        f"{avg_tokens:^6}"
    )
    print(sep + "\n")

    return {
        "timestamp": datetime.now().isoformat(),
        "total_cases": n,
        "tool_ok": totals["tool"],
        "json_ok": totals["json"],
        "no_cert": totals["cert"],
        "not_empty": totals["empty"],
        "avg_tone": round(avg_tone, 2),
        "avg_latency_ms": avg_latency,
        "avg_tokens": avg_tokens,
    }


def append_to_csv(summary: dict):
    """Append a summary row to results.csv."""
    file_exists = os.path.exists(RESULTS_CSV)
    fieldnames = list(summary.keys())

    with open(RESULTS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(summary)

    print(f"Results appended to {RESULTS_CSV}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("Loading golden set...")
    cases = load_golden_set()
    print(f"Loaded {len(cases)} test cases\n")

    rows = []
    for case in cases:
        case_id = case["id"]
        print(f"Running {case_id}: {case['input'][:60]}...")

        result = run_case(case)

        if result.get("api_error"):
            print(f"  ❌ API ERROR: {result['error']}")
            rows.append({
                "id": case_id,
                "tool_ok": False,
                "json_ok": False,
                "no_cert": True,
                "not_empty": False,
                "tone": -1.0,
                "latency_ms": 0,
                "tokens": 0,
            })
            continue

        # Deterministic checks
        tool_ok = check_tool_called(case, result)
        json_ok = check_json_well_formed(result)
        no_cert = check_no_certainty_claims(result)
        not_empty = check_response_not_empty(result)

        # Token count (approximate by word count * 1.3)
        response_text = result.get("response", "")
        tokens = int(len(response_text.split()) * 1.3)

        # LLM judge for tone
        tone = score_tone_with_llm(response_text) if response_text else -1.0

        print(f"  tool_ok={tool_ok} json_ok={json_ok} no_cert={no_cert} "
              f"not_empty={not_empty} tone={tone} latency={result['latency_ms']}ms")

        rows.append({
            "id": case_id,
            "tool_ok": tool_ok,
            "json_ok": json_ok,
            "no_cert": no_cert,
            "not_empty": not_empty,
            "tone": tone,
            "latency_ms": result["latency_ms"],
            "tokens": tokens,
        })

    summary = print_scorecard(rows)
    append_to_csv(summary)


if __name__ == "__main__":
    main()
