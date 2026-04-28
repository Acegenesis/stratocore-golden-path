import sys
import tempfile
import os
import requests

ALB_URL = "http://Strato-Alb16-QfPhCNBdmsKz-443751361.us-east-1.elb.amazonaws.com"
LAMBDA_URL = "https://jz3m8ufog3.execute-api.us-east-1.amazonaws.com"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"

errors = 0


def check(label: str, condition: bool, detail: str = ""):
    global errors
    if condition:
        print(f"  {PASS} {label}")
    else:
        print(f"  {FAIL} {label}" + (f" — {detail}" if detail else ""))
        errors += 1


def run(base_url: str):
    base_url = base_url.rstrip("/")
    print(f"\nTarget: {base_url}\n")

    # 1. Health check
    print("GET /health")
    r = requests.get(f"{base_url}/health")
    check("status 200", r.status_code == 200, str(r.status_code))
    check('body {"status":"healthy"}', r.json() == {"status": "healthy"}, r.text)

    # 2. Upload
    print("\nPOST /upload")
    tmp = tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w")
    tmp.write("stratocore test file")
    tmp.close()
    filename = os.path.basename(tmp.name)
    with open(tmp.name, "rb") as f:
        r = requests.post(f"{base_url}/upload", files={"file": (filename, f)})
    os.unlink(tmp.name)
    check("status 200", r.status_code == 200, str(r.status_code))
    check("uploaded successfully", r.json().get("message") == "uploaded successfully", r.text)

    # 3. List files
    print("\nGET /files")
    r = requests.get(f"{base_url}/files")
    check("status 200", r.status_code == 200, str(r.status_code))
    files = r.json().get("files", [])
    check(f"file '{filename}' present in list", filename in files, str(files))

    # 4. Delete
    print(f"\nDELETE /files/{filename}")
    r = requests.delete(f"{base_url}/files/{filename}")
    check("status 200", r.status_code == 200, str(r.status_code))
    check("deleted successfully", r.json().get("message") == "deleted successfully", r.text)

    # 5. Verify deletion
    print("\nGET /files (verify deletion)")
    r = requests.get(f"{base_url}/files")
    files_after = r.json().get("files", [])
    check(f"file '{filename}' no longer in list", filename not in files_after, str(files_after))

    print(f"\n{'All tests passed!' if errors == 0 else f'{errors} test(s) failed.'}\n")
    return errors == 0


if __name__ == "__main__":
    results = {}
    for name, url in [("Lambda (API Gateway)", LAMBDA_URL), ("ECS (ALB)", ALB_URL)]:
        print(f"{'='*50}\n{name}")
        errors = 0
        results[name] = run(url)

    print("=" * 50)
    print("Summary:")
    for name, ok in results.items():
        print(f"  {PASS if ok else FAIL} {name}")
    print()
    sys.exit(0 if all(results.values()) else 1)