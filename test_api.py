import requests
import json

# Authentication endpoint
auth_url = "http://localhost:8002/auth-users/api/v1/token/"

# Your credentials
credentials = {
    "username": "coachessam",  # Replace with your actual username
    "password": "coach123"   # Replace with your actual password
}

# Get JWT token
auth_response = requests.post(auth_url, json=credentials)
print(f"Auth Status: {auth_response.status_code}")

if auth_response.status_code == 200:
    tokens = auth_response.json()
    access_token = tokens.get('access')
    
    # Define the API endpoint
    url = "http://localhost:8002/plan-management/api/v1/meal-templates/"
    
    # Define headers with content type and auth token
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    print("Successfully obtained access token")
else:
    print("Authentication failed:")
    print(auth_response.text)
    exit(1)

# Define the payload
payload = {
    "meal_name": "Test Meal via Script",
    "meal_type": "breakfast",
    "calories": 500,
    "protein_grams": 30,
    "carbs_grams": 50,
    "fats_grams": 20,
    "category": "High Protein",
    "description": "A test meal created via Python",
    "preparation_time_minutes": 15,
    "cooking_time_minutes": 10,
    "recipe": "Cook and serve",
    "template": 17,
    "ingredients": [
        {
            "name": "Eggs",
            "quantity": 3,
            "unit": "pcs",
            "category": "Protein",
            "notes": "Fresh eggs"
        },
        {
            "name": "Bread",
            "quantity": 2,
            "unit": "slices",
            "category": "Carbs",
            "notes": "Whole grain"
        }
    ]
}

# Make the POST request
response = requests.post(url, headers=headers, json=payload)

# Print the response status and content
print(f"Status Code: {response.status_code}")
print("Response Content:")
try:
    print(json.dumps(response.json(), indent=4))
except Exception as e:
    print(response.text)
    print(f"Error parsing JSON: {e}")
