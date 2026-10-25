import json
import importlib.util
import sys
from pathlib import Path

intent_path = Path(__file__).resolve().parents[1] / "app" / "analysis" / "intent.py"
spec = importlib.util.spec_from_file_location("aurabi_scout_intent", intent_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load Scout Intent engine from {intent_path}")
intent_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = intent_module
spec.loader.exec_module(intent_module)
ScoutIntentEngine = intent_module.ScoutIntentEngine


CASES = [
    ("Show revenue by region", "informational"),
    ("List the top customers", "informational"),
    ("Describe the orders table", "informational"),
    ("How many active accounts are there?", "informational"),
    ("Compare sales by product", "informational"),
    ("Give me the average order value", "informational"),
    ("Find customers in Paris", "informational"),
    ("What was revenue last month?", "informational"),
    ("Show the schema for transactions", "informational"),
    ("Explain the sales margin", "informational"),
    ("Forecast next quarter revenue", "predictive"),
    ("Predict customer churn", "predictive"),
    ("What is the revenue trend?", "predictive"),
    ("Detect anomalies in payments", "predictive"),
    ("Assess fraud risk", "predictive"),
    ("Project demand for next year", "predictive"),
    ("Find future sales growth", "predictive"),
    ("Estimate next month's orders", "predictive"),
    ("Identify unusual account activity", "predictive"),
    ("Give a risk projection", "predictive"),
    ("Drop the sales table", "action-oriented"),
    ("Delete inactive customers", "action-oriented"),
    ("Update the customer status", "action-oriented"),
    ("Export all transactions", "action-oriented"),
    ("Create a new reporting table", "action-oriented"),
    ("Run the pipeline", "action-oriented"),
    ("Write these results to the warehouse", "action-oriented"),
    ("Truncate the staging table", "action-oriented"),
    ("Remove the old column", "action-oriented"),
    ("Execute the cleanup job", "action-oriented"),
]


def main() -> None:
    engine = ScoutIntentEngine()
    results = []
    for prompt, expected in CASES:
        decision = engine.classify(prompt)
        results.append(
            {
                "prompt": prompt,
                "expected": expected,
                "actual": decision.intent,
                "correct": decision.intent == expected,
                "decision": decision.as_dict(),
            }
        )
    correct = sum(result["correct"] for result in results)
    report = {
        "engine": "scout-intent",
        "case_count": len(results),
        "correct": correct,
        "accuracy": correct / len(results),
        "results": results,
    }
    output = Path("scout_intent_results.json")
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"Scout Intent accuracy: {correct}/{len(results)} ({report['accuracy']:.1%})")
    print(f"Results written to {output}")


if __name__ == "__main__":
    main()
