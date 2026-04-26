import os

import boto3
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from mangum import Mangum

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    bucket = os.environ["BUCKET_NAME"]
    s3 = boto3.client("s3")
    try:
        content = await file.read()
        s3.put_object(Bucket=bucket, Key=file.filename, Body=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"filename": file.filename, "message": "uploaded successfully"}


@app.get("/files")
def list_files():
    bucket = os.environ["BUCKET_NAME"]
    s3 = boto3.client("s3")
    try:
        response = s3.list_objects_v2(Bucket=bucket)
        files = [o["Key"] for o in response.get("Contents", [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"files": files}


@app.delete("/files/{filename}")
def delete_file(filename: str):
    bucket = os.environ["BUCKET_NAME"]
    s3 = boto3.client("s3")
    try:
        s3.delete_object(Bucket=bucket, Key=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"filename": filename, "message": "deleted successfully"}


handler = Mangum(app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
