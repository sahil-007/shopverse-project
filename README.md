# ShopVerse - Full-Stack E-Commerce Application

A production-ready 2-tier e-commerce web application built with React, Go (Fiber), and MySQL, deployed on AWS EKS using Helm charts.

## Architecture

```
                         +------------------+
                         |   AWS ALB        |
                         | (Ingress Controller) |
                         +--------+---------+
                                  |
                    +-------------+-------------+
                    |                           |
              /api/* routes               /* routes
                    |                           |
           +--------v---------+     +-----------v----------+
           | Backend Service  |     | Frontend Service     |
           | (Go + Fiber)     |     | (React + Nginx)      |
           | Port 8080        |     | Port 80              |
           | NodePort: 30081  |     | NodePort: 30080      |
           | 2 replicas       |     | 2 replicas           |
           +--------+---------+     +----------------------+
                    |
           +--------v---------+
           | MySQL StatefulSet|
           | Port 3306        |
           | 5Gi PVC (gp2)   |
           +------------------+
```

## Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Frontend | React 18, TailwindCSS, Vite    |
| Backend  | Go 1.21, Fiber, GORM, JWT      |
| Database | MySQL 8.0 (StatefulSet)        |
| Infra    | AWS EKS, ECR, ALB, Terraform   |
| CI/CD    | GitHub Actions, Helm, Trivy    |
| IaC      | Terraform Modules (VPC, EKS, EC2) |

## API Endpoints

| Method | Endpoint            | Auth     | Description             |
|--------|---------------------|----------|-------------------------|
| POST   | /api/auth/register  | No       | Register new user       |
| POST   | /api/auth/login     | No       | Login, returns JWT      |
| GET    | /api/products       | No       | List products           |
| GET    | /api/products/:id   | No       | Get single product      |
| POST   | /api/products       | JWT      | Create product (admin)  |
| GET    | /api/cart           | JWT      | Get user's cart         |
| POST   | /api/cart           | JWT      | Add item to cart        |
| PUT    | /api/cart/:id       | JWT      | Update cart item qty    |
| DELETE | /api/cart/:id       | JWT      | Remove cart item        |
| GET    | /api/orders         | JWT      | Get user's orders       |
| POST   | /api/orders         | JWT      | Place order from cart   |
| GET    | /health             | No       | Health check            |

---

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend dev)
- Go 1.21+ (for backend dev)

### Quick Start with Docker Compose

```bash
# Clone the repo
git clone <repo-url> && cd shopverse

# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
```

### Run Frontend Individually (Hot Reload)

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000 with proxy to backend
```

### Run Backend Individually

```bash
cd backend
go mod tidy
DB_HOST=localhost DB_USER=shopverse DB_PASSWORD=shopverse123 DB_NAME=shopverse go run ./cmd/main.go
```

---

## AWS Deployment (Step-by-Step from Local)

### Prerequisites

Install the following tools on your local machine:

| Tool       | Version  | Download |
|------------|----------|----------|
| Terraform  | >= 1.5.0 | https://developer.hashicorp.com/terraform/downloads |
| AWS CLI v2 | Latest   | https://aws.amazon.com/cli/ |
| kubectl    | Latest   | https://kubernetes.io/docs/tasks/tools/ |
| Helm 3     | Latest   | https://helm.sh/docs/intro/install/ |
| Docker     | Latest   | https://docs.docker.com/get-docker/ |

---

### Step 1: Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: us-east-1
# Default output format: json

# Verify your identity
aws sts get-caller-identity
```

---

### Step 2: Create AWS Infrastructure using Terraform

Terraform modules will create: VPC, EKS Cluster, Node Group, IAM Roles, Jump Server (EC2).

See [terraform/README.md](terraform/README.md) for detailed Terraform instructions.

```bash
cd terraform

# Create S3 bucket for Terraform state (one-time setup)
aws s3api create-bucket \
  --bucket shopverse-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket shopverse-terraform-state \
  --versioning-configuration Status=Enabled

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (cluster name, region, instance types, etc.)

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Create the infrastructure (~15-20 minutes)
terraform apply
# Type 'yes' when prompted
```

After apply completes, note the outputs:
```bash
terraform output
```

---

### Step 3: Connect to the EKS Cluster

```bash
# Update your local kubeconfig (use cluster name from terraform output)
aws eks update-kubeconfig --name shopverse-cluster --region us-east-1

# Verify connection - you should see your worker nodes
kubectl get nodes
kubectl cluster-info
```

---

### Step 4: Create ECR Repositories

Create 3 ECR repositories for frontend, backend, and Helm chart:

```bash
# Get your AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1

# Create repositories
aws ecr create-repository --repository-name shopverse-frontend --region $REGION
aws ecr create-repository --repository-name shopverse-backend --region $REGION
aws ecr create-repository --repository-name shopverse-helmchart --region $REGION

# Verify repositories were created
aws ecr describe-repositories --region $REGION --query 'repositories[].repositoryName'
```

---

### Step 5: Build Docker Images

```bash
# Navigate to project root
cd ..

# Build frontend image
docker build -t shopverse-frontend:v1 ./frontend

# Build backend image
docker build -t shopverse-backend:v1 ./backend

# Verify images were built
docker images | grep shopverse
```

---

### Step 6: Tag Docker Images

Tag the images with the ECR repository URI:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Tag frontend image
docker tag shopverse-frontend:v1 ${ECR_URI}/shopverse-frontend:v1

# Tag backend image
docker tag shopverse-backend:v1 ${ECR_URI}/shopverse-backend:v1

# Verify tags
docker images | grep ${ACCOUNT_ID}
```

---

### Step 7: Push Docker Images to ECR

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin ${ECR_URI}

# Push frontend image
docker push ${ECR_URI}/shopverse-frontend:v1

# Push backend image
docker push ${ECR_URI}/shopverse-backend:v1

# Verify images in ECR
aws ecr list-images --repository-name shopverse-frontend --region $REGION
aws ecr list-images --repository-name shopverse-backend --region $REGION
```

---

### Step 8: Push Helm Chart to ECR (Optional)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Login to ECR for Helm
aws ecr get-login-password --region $REGION | \
  helm registry login --username AWS --password-stdin ${ECR_URI}

# Package the Helm chart
helm package ./helm/shopverse

# Push Helm chart to ECR
helm push shopverse-1.0.0.tgz oci://${ECR_URI}/shopverse-helmchart

# Verify
aws ecr list-images --repository-name shopverse-helmchart --region $REGION
```

---

### Step 9: Install EKS Add-ons

```bash
# Install EBS CSI Driver (required for MySQL PVC)
# If using Terraform modules, EBS CSI is already installed as an addon.
# If not, install manually:
eksctl utils associate-iam-oidc-provider --cluster shopverse-cluster --region us-east-1 --approve

eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster shopverse-cluster \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve

aws eks create-addon --cluster-name shopverse-cluster --addon-name aws-ebs-csi-driver --region us-east-1

# Install AWS Load Balancer Controller (required for ALB Ingress)
ALB_ROLE_ARN=$(cd terraform && terraform output -raw alb_controller_role_arn)

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=shopverse-cluster \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=$ALB_ROLE_ARN
```

---

### Step 10: Deploy Application using Helm

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
ECR_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

helm upgrade --install shopverse ./helm/shopverse \
  --set frontend.image=${ECR_URI}/shopverse-frontend:v1 \
  --set backend.image=${ECR_URI}/shopverse-backend:v1 \
  --set mysql.rootPassword=YourRootPassword123 \
  --set mysql.password=YourAppPassword123 \
  --set jwtSecret=YourJwtSecretKey123 \
  --namespace shopverse \
  --create-namespace \
  --wait --timeout 600s
```

---

### Step 11: Verify Deployment

```bash
# Check all pods are running (should see 5 pods: 2 frontend, 2 backend, 1 mysql)
kubectl get pods -n shopverse

# Check services (frontend NodePort:30080, backend NodePort:30081)
kubectl get svc -n shopverse

# Check persistent volume claims (MySQL storage)
kubectl get pvc -n shopverse

# Check all resources at once
kubectl get all -n shopverse

# Check pod logs if needed
kubectl logs -n shopverse -l component=backend --tail=50
kubectl logs -n shopverse -l component=frontend --tail=50
kubectl logs -n shopverse shopverse-mysql-0 --tail=50
```

---

### Step 12: Access the Application

**Get Node External IPs:**
```bash
kubectl get nodes -o wide
# Note the EXTERNAL-IP column
```

**Access via NodePort:**
```
Frontend:  http://<NODE_EXTERNAL_IP>:30080
Backend:   http://<NODE_EXTERNAL_IP>:30081
Health:    http://<NODE_EXTERNAL_IP>:30081/health
```

**Access via ALB Ingress (if configured):**
```bash
kubectl get ingress -n shopverse
# Use the ADDRESS field as the URL
```

> **Note:** Make sure the EKS node security group allows inbound traffic on ports **30080** and **30081**. You can update this in AWS Console > EC2 > Security Groups > find the node security group > add inbound rules for Custom TCP ports 30080 and 30081 from `0.0.0.0/0`.

---

## Connect to Jump Server

If you created a jump server via Terraform (`create_jump_server = true`):

1. Go to **AWS Console** > **EC2** > **Instances**
2. Select the jump server instance
3. Click **Connect** > Choose **EC2 Instance Connect** > Click **Connect**

The jump server comes pre-installed with: AWS CLI, kubectl, Helm, Docker, Git.

```bash
# Once connected, verify tools
kubectl get nodes
helm version
docker --version

# Check application pods
kubectl get pods -n shopverse
kubectl get svc -n shopverse
```

---

## Querying the Database

### Understanding the Database

ShopVerse uses MySQL 8.0 running as a Kubernetes StatefulSet. The database contains these tables:

| Table | Description |
|-------|-------------|
| `users` | Registered users (name, email, hashed password) |
| `products` | Product catalog - 28 products across 6 categories |
| `orders` | Customer orders (total amount, status, timestamps) |
| `order_items` | Individual items within each order (product, quantity, price) |
| `cart_items` | Current shopping cart contents per user |

### Step 1: Get the Database Password

The MySQL password is stored as a Kubernetes secret (base64 encoded):

```bash
# Decode the database password from the Kubernetes secret
DB_PASSWORD=$(kubectl get secret -n shopverse shopverse-secret \
  -o jsonpath='{.data.DB_PASSWORD}' | base64 -d)

# Verify you got the password (optional)
echo $DB_PASSWORD
```

**How this works:**
- `kubectl get secret` fetches the Kubernetes secret object
- `-o jsonpath='{.data.DB_PASSWORD}'` extracts just the password field
- `| base64 -d` decodes it from base64 (Kubernetes stores secrets in base64)

### Step 2: Connect to MySQL Shell

```bash
# Open an interactive MySQL shell inside the MySQL pod
kubectl exec -it -n shopverse shopverse-mysql-0 -- mysql -u shopverse -p"$DB_PASSWORD" shopverse
```

**How this works:**
- `kubectl exec -it` runs an interactive command inside a pod
- `-n shopverse` specifies the namespace
- `shopverse-mysql-0` is the MySQL pod name (StatefulSet pod naming: `<name>-0`)
- `-- mysql -u shopverse -p"$DB_PASSWORD" shopverse` runs the MySQL client
  - `-u shopverse` = database username
  - `-p"$DB_PASSWORD"` = password (no space between `-p` and the password)
  - `shopverse` (at end) = database name to connect to

### Step 3: Run Queries Inside MySQL Shell

Once inside the MySQL shell (you'll see `mysql>` prompt):

#### View all tables
```sql
SHOW TABLES;
```
This shows all 5 tables: `users`, `products`, `orders`, `order_items`, `cart_items`.

#### View registered users
```sql
SELECT id, name, email, created_at FROM users;
```
Shows all users who registered through the app. Passwords are hashed with bcrypt so they are not shown here.

#### View all products
```sql
SELECT id, name, category, price, original_price, rating, badge FROM products;
```
Lists all 28 seeded products with their category, pricing, rating, and badge info.

#### View products grouped by category
```sql
SELECT category, COUNT(*) AS total_products,
       ROUND(AVG(price), 2) AS avg_price,
       ROUND(MIN(price), 2) AS min_price,
       ROUND(MAX(price), 2) AS max_price
FROM products
GROUP BY category
ORDER BY total_products DESC;
```
Shows product count and price stats per category (Electronics, Clothing, Accessories, Food & Drinks, Sports, Home & Living).

#### View all orders with customer info
```sql
SELECT
    o.id AS order_id,
    u.name AS customer_name,
    u.email AS customer_email,
    o.total_amount,
    o.status,
    o.created_at AS order_date
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC;
```
**How this works:**
- `JOIN users u ON o.user_id = u.id` links each order to the user who placed it
- `ORDER BY o.created_at DESC` shows newest orders first
- `o.status` shows the order status (e.g., pending, completed)

#### View order items with product details
```sql
SELECT
    oi.order_id,
    p.name AS product_name,
    p.category,
    oi.quantity,
    oi.price AS unit_price,
    (oi.quantity * oi.price) AS subtotal
FROM order_items oi
JOIN products p ON oi.product_id = p.id
ORDER BY oi.order_id, p.name;
```
**How this works:**
- `order_items` stores what was purchased in each order
- `JOIN products p ON oi.product_id = p.id` links item to its product details
- `(oi.quantity * oi.price)` calculates the subtotal for each line item

#### View complete order breakdown (orders + items together)
```sql
SELECT
    o.id AS order_id,
    u.name AS customer,
    p.name AS product,
    oi.quantity,
    oi.price AS unit_price,
    (oi.quantity * oi.price) AS subtotal,
    o.total_amount AS order_total,
    o.status,
    o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
ORDER BY o.id, p.name;
```
This is the most complete view - joins 4 tables to show who ordered what, quantities, prices, and order status.

#### View current cart items
```sql
SELECT
    ci.id AS cart_item_id,
    u.name AS customer,
    p.name AS product,
    p.category,
    ci.quantity,
    p.price AS unit_price,
    (ci.quantity * p.price) AS subtotal
FROM cart_items ci
JOIN users u ON ci.user_id = u.id
JOIN products p ON ci.product_id = p.id
ORDER BY u.name;
```
Shows items currently in users' shopping carts (items that haven't been ordered yet).

#### Dashboard summary
```sql
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS total_revenue,
    (SELECT COUNT(*) FROM cart_items) AS items_in_carts;
```
A quick overview of the entire application's data - total users, products, orders, revenue, and active cart items.

#### Exit MySQL shell
```sql
EXIT;
```

### Quick One-Liner Queries (Without Entering MySQL Shell)

These run a query directly from your terminal without opening the interactive MySQL shell:

```bash
# First, get the DB password
DB_PASSWORD=$(kubectl get secret -n shopverse shopverse-secret \
  -o jsonpath='{.data.DB_PASSWORD}' | base64 -d)
```

```bash
# List all registered users
kubectl exec -n shopverse shopverse-mysql-0 -- \
  mysql -u shopverse -p"$DB_PASSWORD" shopverse \
  -e "SELECT id, name, email, created_at FROM users;"
```

```bash
# List all orders with customer names
kubectl exec -n shopverse shopverse-mysql-0 -- \
  mysql -u shopverse -p"$DB_PASSWORD" shopverse \
  -e "SELECT o.id, u.name, o.total_amount, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id;"
```

```bash
# List order items with product details
kubectl exec -n shopverse shopverse-mysql-0 -- \
  mysql -u shopverse -p"$DB_PASSWORD" shopverse \
  -e "SELECT oi.order_id, p.name, oi.quantity, oi.price, (oi.quantity * oi.price) AS subtotal FROM order_items oi JOIN products p ON oi.product_id = p.id ORDER BY oi.order_id;"
```

```bash
# Count products per category
kubectl exec -n shopverse shopverse-mysql-0 -- \
  mysql -u shopverse -p"$DB_PASSWORD" shopverse \
  -e "SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY count DESC;"
```

```bash
# Quick dashboard summary
kubectl exec -n shopverse shopverse-mysql-0 -- \
  mysql -u shopverse -p"$DB_PASSWORD" shopverse \
  -e "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COALESCE(SUM(total_amount),0) FROM orders) AS revenue;"
```

**How the `-e` flag works:**
- `-e "SQL QUERY"` executes the query and exits immediately (no interactive shell)
- Useful for quick checks or scripting

---

## CI/CD Pipeline (GitHub Actions)

### Configure GitHub Secrets

Go to your GitHub repo > Settings > Secrets and variables > Actions, and add:

| Secret                  | Description                                           |
|-------------------------|-------------------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | IAM user access key                                   |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key                                   |
| `AWS_REGION`            | e.g., `us-east-1`                                     |
| `ECR_REGISTRY`          | e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com`    |
| `EKS_CLUSTER_NAME`      | e.g., `shopverse-cluster`                             |
| `TF_STATE_BUCKET`       | S3 bucket for Terraform state                         |
| `MYSQL_ROOT_PASSWORD`   | MySQL root password                                   |
| `MYSQL_PASSWORD`         | MySQL application user password                       |
| `JWT_SECRET`             | Secret key for JWT token signing                      |

### Pipeline Stages

Push to `main` branch triggers the 4-stage pipeline:

1. **Test** - Go tests + frontend linting
2. **Security Scan** - Trivy vulnerability scanning on Docker images
3. **Build & Push** - Build images, tag with SHA, push to ECR
4. **Deploy** - Provision infra with Terraform if needed, deploy Helm chart

---

## Modify / Scale the Application

```bash
# Scale frontend to 3 replicas
kubectl scale deployment shopverse-frontend -n shopverse --replicas=3

# Scale backend to 3 replicas
kubectl scale deployment shopverse-backend -n shopverse --replicas=3

# Rolling restart (picks up new config without downtime)
kubectl rollout restart deployment/shopverse-frontend -n shopverse
kubectl rollout restart deployment/shopverse-backend -n shopverse

# Update images (deploy new version)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI=${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

helm upgrade shopverse ./helm/shopverse \
  --set frontend.image=${ECR_URI}/shopverse-frontend:v2 \
  --set backend.image=${ECR_URI}/shopverse-backend:v2 \
  --reuse-values -n shopverse
```

## Destroy Everything

```bash
# Step 1: Delete application resources
helm uninstall shopverse -n shopverse
kubectl delete pvc --all -n shopverse
kubectl delete namespace shopverse

# Step 2: Destroy AWS infrastructure
cd terraform
terraform destroy
# Type 'yes' when prompted
```

> **Warning:** This deletes the EKS cluster, VPC, jump server, and all associated resources.

---

## Project Structure

```
shopverse/
├── frontend/                  # React + TailwindCSS (Vite)
│   ├── src/
│   │   ├── components/        # Navbar, ProductCard, CartSidebar
│   │   ├── pages/             # Auth, Home, Products, Cart, Orders, Wishlist
│   │   ├── App.jsx            # Routes, context, API client
│   │   └── main.jsx           # Entry point
│   ├── Dockerfile             # Multi-stage: Node -> Nginx
│   └── nginx.conf             # React Router + API proxy
├── backend/                   # Go + Fiber REST API
│   ├── cmd/main.go            # Entry point, routes
│   ├── internal/
│   │   ├── handlers/          # Auth, Products, Cart, Orders
│   │   ├── models/            # GORM models
│   │   ├── database/          # DB connection + seed data (28 products)
│   │   └── middleware/        # JWT auth middleware
│   └── Dockerfile             # Multi-stage: Go -> Distroless
├── helm/shopverse/            # Helm chart
│   ├── templates/             # K8s manifests (10 YAML files)
│   │   ├── secret.yaml        # DB passwords, JWT secret
│   │   ├── configmap.yaml     # DB host, port, name config
│   │   ├── mysql-pvc.yaml     # 5Gi persistent volume claim
│   │   ├── mysql-statefulset.yaml  # MySQL 8.0 pod
│   │   ├── mysql-service.yaml      # MySQL ClusterIP service
│   │   ├── backend-deployment.yaml # Go API (2 replicas)
│   │   ├── backend-service.yaml    # NodePort 30081
│   │   ├── frontend-deployment.yaml # React+Nginx (2 replicas)
│   │   ├── frontend-service.yaml    # NodePort 30080
│   │   └── ingress.yaml            # ALB ingress
│   ├── values.yaml            # Configurable values
│   └── Chart.yaml             # Chart metadata
├── terraform/                 # Infrastructure as Code (Modules)
│   ├── main.tf                # Root - wires all modules
│   ├── variables.tf           # Root input variables
│   ├── outputs.tf             # Root outputs
│   ├── versions.tf            # Provider versions + S3 backend
│   ├── terraform.tfvars.example
│   ├── README.md              # Detailed Terraform guide
│   └── modules/
│       ├── vpc/               # VPC, subnets, IGW, NAT, routes
│       ├── eks/               # EKS cluster, node group, OIDC, addons
│       └── ec2/               # Jump server (Ubuntu 22.04)
├── .github/workflows/         # CI/CD pipeline
│   └── deploy.yml             # 4-stage: test -> scan -> build -> deploy
├── docker-compose.yml         # Local development
└── README.md
```

## Troubleshooting

### Pods stuck in Pending
```bash
kubectl describe pod <pod-name> -n shopverse
kubectl get pvc -n shopverse
# Common cause: EBS CSI driver not installed (PVC can't bind)
```

### Frontend can't reach backend (502/504)
```bash
kubectl get svc -n shopverse
kubectl logs -n shopverse -l component=backend
# Verify backend pods are running and healthy
```

### MySQL connection refused
```bash
kubectl get pods -n shopverse -l component=mysql
kubectl logs -n shopverse shopverse-mysql-0
# Check if MySQL is still initializing
```

### Can't access NodePort from browser
```bash
# Check node security group allows ports 30080 and 30081
# AWS Console > EC2 > Security Groups > Node security group > Inbound rules
# Add: Custom TCP, Port 30080, Source 0.0.0.0/0
# Add: Custom TCP, Port 30081, Source 0.0.0.0/0
```

### Images not updating after push
```bash
# Use a new tag instead of reusing the same one
helm upgrade shopverse ./helm/shopverse \
  --set frontend.image=<ECR>/shopverse-frontend:v2 \
  --set backend.image=<ECR>/shopverse-backend:v2 \
  --reuse-values -n shopverse
```

---

## License

MIT
