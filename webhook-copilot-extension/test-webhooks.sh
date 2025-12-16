#!/bin/bash

# Webhook Testing Script
# Usage: ./test-webhooks.sh [action_type]

SERVER_URL="${WEBHOOK_SERVER_URL:-http://localhost:9090/webhook}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Webhook Testing Script ===${NC}"
echo -e "Server: ${SERVER_URL}\n"

# Test connection endpoint
test_connection() {
    echo -e "${YELLOW}Testing: Connection${NC}"
    
    # Test health check
    echo "1. Health check..."
    curl -s http://localhost:9090/health | python3 -m json.tool
    
    echo -e "\n2. Test endpoint..."
    curl -X POST http://localhost:9090/test \
      -H "Content-Type: application/json" \
      -d '{
        "message": "Hello from test script!",
        "timestamp": '$(date +%s)'
      }' | python3 -m json.tool
    
    echo -e "\n${GREEN}✓ Connection tests complete${NC}\n"
}

# Test execute_task action
test_execute_task() {
    echo -e "${YELLOW}Testing: execute_task${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "execute_task",
        "task": "Create a simple TypeScript function to calculate fibonacci numbers",
        "options": {
          "notify": true,
          "auto_approve": false
        }
      }'
    echo -e "\n${GREEN}✓ execute_task sent${NC}\n"
}

# Test execute_task with file context
test_execute_task_with_context() {
    echo -e "${YELLOW}Testing: execute_task with file context${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "execute_task",
        "task": "Add error handling to this authentication function",
        "context": {
          "files": ["src/extension.ts"],
          "currentFile": "src/extension.ts",
          "branch": "main"
        },
        "options": {
          "openFiles": true,
          "notify": true
        }
      }'
    echo -e "\n${GREEN}✓ execute_task with context sent${NC}\n"
}

# Test create_file action
test_create_file() {
    echo -e "${YELLOW}Testing: create_file${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "create_file",
        "context": {
          "file": "test-webhook-file.txt",
          "content": "This file was created via webhook at '"$(date)"'"
        },
        "options": {
          "notify": true
        }
      }'
    echo -e "\n${GREEN}✓ create_file sent${NC}\n"
}

# Test copilot_chat action
test_copilot_chat() {
    echo -e "${YELLOW}Testing: copilot_chat${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "copilot_chat",
        "prompt": "What are the best practices for error handling in TypeScript?",
        "options": {
          "notify": false
        }
      }'
    echo -e "\n${GREEN}✓ copilot_chat sent${NC}\n"
}

# Test query_workspace action
test_query_workspace() {
    echo -e "${YELLOW}Testing: query_workspace${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "query_workspace",
        "context": {
          "query": "**/*.ts"
        },
        "options": {
          "notify": true
        }
      }'
    echo -e "\n${GREEN}✓ query_workspace sent${NC}\n"
}

# Test run_command action
test_run_command() {
    echo -e "${YELLOW}Testing: run_command${NC}"
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "run_command",
        "context": {
          "command": "workbench.action.files.saveAll"
        },
        "options": {
          "notify": true,
          "auto_approve": false
        }
      }'
    echo -e "\n${GREEN}✓ run_command sent${NC}\n"
}

# Test complex scenario
test_complex_scenario() {
    echo -e "${YELLOW}Testing: Complex Scenario${NC}"
    echo "1. Creating component file..."
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d '{
        "action": "execute_task",
        "task": "Create a React component called Button with TypeScript. It should accept props: label (string), onClick (function), and variant (primary | secondary). Include proper typing and export the component.",
        "context": {
          "framework": "react",
          "language": "typescript"
        },
        "options": {
          "auto_approve": false,
          "notify": true
        }
      }'
    
    echo -e "\n${GREEN}✓ Complex scenario sent${NC}\n"
}

# Test sending an image with a prompt
test_image_request() {
    echo -e "${YELLOW}Testing: Image request (vision/multimodal)${NC}"
    
    # Check if an image file is provided
    if [ -n "$2" ] && [ -f "$2" ]; then
        IMAGE_FILE="$2"
    else
        # Create a simple test image (1x1 red PNG)
        # This is a minimal valid PNG for testing
        echo -e "\nNo image file provided. Using a test placeholder."
        echo -e "Usage: $0 image [path/to/image.png]\n"
        
        # Minimal 1x1 red PNG in base64
        IMAGE_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        
        curl -X POST "$SERVER_URL" \
          -H "Content-Type: application/json" \
          -d '{
            "prompt": "This is a test image request. Please describe what you see.",
            "images": [
              {
                "data": "'"$IMAGE_BASE64"'",
                "mimeType": "image/png",
                "description": "Test placeholder image"
              }
            ]
          }'
        echo -e "\n${GREEN}✓ Image request sent (with placeholder)${NC}\n"
        return
    fi
    
    # Encode the provided image
    echo "Encoding image: $IMAGE_FILE"
    IMAGE_BASE64=$(base64 -i "$IMAGE_FILE" | tr -d '\n')
    
    # Determine MIME type from extension
    case "${IMAGE_FILE##*.}" in
        png) MIME_TYPE="image/png" ;;
        jpg|jpeg) MIME_TYPE="image/jpeg" ;;
        gif) MIME_TYPE="image/gif" ;;
        webp) MIME_TYPE="image/webp" ;;
        *) MIME_TYPE="image/png" ;;
    esac
    
    echo "MIME type: $MIME_TYPE"
    echo "Sending request..."
    
    # Create JSON payload
    PAYLOAD=$(cat <<EOF
{
  "prompt": "Please analyze this image and describe what you see. If it's a screenshot of code or an error, help me understand and fix any issues.",
  "images": [
    {
      "data": "$IMAGE_BASE64",
      "mimeType": "$MIME_TYPE",
      "description": "User provided image"
    }
  ],
  "context": {
    "source": "test-script"
  }
}
EOF
)
    
    curl -X POST "$SERVER_URL" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD"
    
    echo -e "\n${GREEN}✓ Image request sent${NC}\n"
}

# Main script
case "${1:-all}" in
  test|connection)
    test_connection
    ;;
  execute_task)
    test_execute_task
    ;;
  execute_task_context)
    test_execute_task_with_context
    ;;
  create_file)
    test_create_file
    ;;
  copilot_chat)
    test_copilot_chat
    ;;
  query_workspace)
    test_query_workspace
    ;;
  run_command)
    test_run_command
    ;;
  complex)
    test_complex_scenario
    ;;
  image)
    test_image_request
    ;;
  all)
    test_connection
    sleep 2
    test_execute_task
    sleep 2
    test_execute_task_with_context
    sleep 2
    test_create_file
    sleep 2
    test_copilot_chat
    sleep 2
    test_query_workspace
    sleep 2
    test_run_command
    ;;
  *)
    echo "Usage: $0 {test|connection|execute_task|execute_task_context|create_file|copilot_chat|query_workspace|run_command|complex|image|all}"
    exit 1
    ;;
esac

echo -e "${BLUE}=== Tests Complete ===${NC}"
echo "Check VS Code for webhook notifications and Copilot Chat activity"
