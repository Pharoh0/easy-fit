import requests
import json
import sys

# Base URL for our API
base_url = "http://localhost:8002"

# Authenticate to get JWT token
def get_token():
    auth_data = {
        "username": "coachessam",  # Replace with actual username
        "password": "adminadmin"      # Replace with actual password
    }
    
    # Try different token endpoint paths
    token_endpoints = [
        "/auth-users/api/v1/token/refresh/",
        "/api/v1/token/",
        "/auth-users/api/token/",
        "/auth-users/token/"
    ]
    
    for endpoint in token_endpoints:
        try:
            print(f"Trying token endpoint: {endpoint}")
            response = requests.post(f"{base_url}{endpoint}", json=auth_data)
            if response.status_code == 200:
                return response.json().get('access')
        except Exception as e:
            print(f"Error with endpoint {endpoint}: {str(e)}")
    
    return None

# Test creating a meal template with ingredients
def test_create_meal_template():
    token = get_token()
    
    if not token:
        print("Failed to get authentication token")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test data
    data = {
        "template": 19,  # Replace with an existing template ID
        "meal_name": "Test Ingredient Notes API",
        "meal_type": "breakfast",
        "category": "Test Category",
        "calories": 300,
        "protein_grams": 20,
        "carbs_grams": 30,
        "fats_grams": 10,
        "preparation_time_minutes": 15,
        "cooking_time_minutes": 10,
        "description": "Description from API test",
        "recipe": "Recipe instructions from API test",
        "ingredients": [
            {
                "name": "Test Ingredient 1",
                "quantity": 100,
                "unit": "g",
                "category": "protein",
                "notes": "Test notes for ingredient 1"
            },
            {
                "name": "Test Ingredient 2",
                "quantity": 50,
                "unit": "ml",
                "category": "liquid",
                "notes": "Test notes for ingredient 2"
            }
        ]
    }
    
    # Make the API request
    endpoint = "/plan-management/api/v1/meal-templates/"
    url = f"{base_url}{endpoint}"
    
    print(f"\nSending POST request to: {url}")
    print(f"With headers: {headers}")
    print(f"With data: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data, headers=headers)
    
    print(f"\nResponse status: {response.status_code}")
    try:
        response_data = response.json()
        print("Response JSON:")
        print(json.dumps(response_data, indent=2))
        
        # Check if ingredients were saved properly
        if 'ingredients' in response_data:
            print(f"\nIngredients count: {len(response_data['ingredients'])}")
            print("Ingredients details:")
            for idx, ingredient in enumerate(response_data['ingredients'], 1):
                print(f"  Ingredient {idx}:")
                print(f"    Name: {ingredient.get('name')}")
                print(f"    Notes: '{ingredient.get('notes')}'")
        else:
            print("\nNo ingredients found in response")
    except Exception as e:
        print(f"Error parsing response: {str(e)}")
        print(f"Raw response: {response.text}")

if __name__ == "__main__":
    test_create_meal_template()
