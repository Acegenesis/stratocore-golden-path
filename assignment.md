# Stratocore Junior Cloud Engineer Assessment

## The Scenario

Stratocore is launching a new microservice. Your mission is to build the "Golden Path" for this service's infrastructure and deployment.

We need a secure, automated way to get a containerized Python application running in AWS. You have full creative control over the implementation details, but we are looking for a solution that balances simplicity with operational maturity.

## Logistics

- Timeframe: We estimate this takes about 6-8 hours, but we are giving you a 3-day window so you can fit it into your schedule comfortably.
- AWS Account: <https://XXXXXXXXXXX.signin.aws.amazon.com/console>
  - Username: `candidate_<firstname>`
  - Password: Complete HERE for password retrieval
  - Region: `us-east-1`
- Tools: Feel free to use whatever tools, documentation, or AI assistants you normally use.

## Technical Requirements

### 1. The Application (FastAPI)

- Create a simple web API using FastAPI.
- Implement the following endpoints:
  - `GET /health`: Returns `{"status": "healthy"}`.
  - `POST /upload`: Accepts a file upload and stores it.
  - `GET /files`: Returns a list of all uploaded filenames.
  - `DELETE /files/{filename}`: Deletes a specific file.
- Important: Data persistence matters. Ensure uploaded files are stored in a way that allows them to persist even if the application container restarts or is redeployed.

### 2. Infrastructure as Code (CDK + TypeScript)

- Define your infrastructure using AWS CDK (Cloud Development Kit).
- Language Requirement: You must use TypeScript for the CDK definition.
- We want to see how you leverage TypeScript's strong typing for infrastructure-as-software.

### 3. Architecture & Networking

You must deploy the application using both a containerized and a serverless approach within your CDK stack to demonstrate versatility.

- VPC: Create a VPC with proper segmentation (Public vs. Private subnets).
- Target 1: Containerized Compute: Run the container on AWS ECS (Fargate) or an EC2 Auto Scaling Group.
  - Access: The application must sit behind an Application Load Balancer (ALB).
  - Security: The application itself must not be reachable directly from the internet.
  - Traffic flow: `Internet -> ALB -> Application`. Configure Security Groups to strictly enforce this flow.
- Target 2: Serverless Compute: You must also package and deploy the same FastAPI application in a fully serverless fashion on AWS. We want you to explore the different available methods for running serverless Python APIs, select the one you believe is the best fit, and implement it.
  - Access: Expose your serverless application securely using your chosen trigger and routing method.

### 4. Automation (AWS Native CI/CD)

- Implement a Continuous Deployment pipeline using AWS-native services (e.g., AWS CodePipeline, AWS CodeBuild).
- The pipeline should:
  1. Detect changes in your source repository. You may use GitHub, Bitbucket, or AWS CodeCommit.
  2. Build the Docker image.
  3. Deploy the updated application to the infrastructure automatically.

## Submission & Next Steps

Please reply with a link to a public Git repository containing your code.

Note: If you chose to use AWS CodeCommit for the task, please mirror the final code to GitHub or attach a zip archive of the repository to your email reply.

## Repository Contents

1. Source Code: The FastAPI app, Dockerfile, and CDK (TypeScript) code.
2. `README.md`: This should include:
   - Architecture Diagram: A brief visual or text explanation of the resources created.
   - Design Decisions: Why did you choose the specific storage solution for the files? How are permissions handled? Additionally, explain your chosen serverless architecture. Which AWS serverless compute and routing/trigger alternatives did you explore? Justify your final choice based on your understanding.
   - Runbook: Instructions on how to deploy the stack from scratch.

## The Demo

Once you have submitted your repository, we will schedule a follow-up interview.

During this call, you will be asked to:

- Demo the live system: Show us the pipeline running and the API endpoints working.
- Walk through the code: Explain your security and architectural choices.
