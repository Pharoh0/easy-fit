import requests
import json
import sys
import os

# Base URL for our API
base_url = "http://localhost:8002"

# Authentication token
auth_token = None

# Authenticate to get JWT token
def get_token():
    auth_data = {
        "username": "coachessam",  # Replace with actual username
        "password": "coach123"      # Replace with actual password
    }
    
    # Try different token endpoint paths
    token_endpoints = [
        "/auth-users/api/v1/login/",  # This is the correct endpoint based on urls.py
        "/auth-users/api/token/",
        "/auth-users/api/v1/token/",
        "/api/token/",
        "/api/v1/token/",
        "/auth-users/token/"
    ]
    
    for endpoint in token_endpoints:
        try:
            print(f"Trying token endpoint: {endpoint}")
            response = requests.post(f"{base_url}{endpoint}", json=auth_data)
            if response.status_code == 200:
                global auth_token
                auth_token = response.json().get('access')
                print(f"Authentication successful, token obtained")
                return auth_token
        except Exception as e:
            print(f"Error with endpoint {endpoint}: {str(e)}")
    
    print("Failed to get authentication token")
    return None

# Create a meal template with multiple images and videos
def test_create_meal_template_with_media():
    if not auth_token:
        get_token()
        if not auth_token:
            sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {auth_token}"
    }
    
    # Create a test template first
    template_data = {
        "name": "Test Media Template",
        "description": "Template for testing media uploads",
        "template_type": "meal",
        "is_public": False
    }
    
    print("\nCreating plan template...")
    template_response = requests.post(
        f"{base_url}/plan-management/api/v1/plan-templates/",
        json=template_data,
        headers=headers
    )
    
    if template_response.status_code not in [200, 201]:
        print(f"Failed to create template: {template_response.status_code}")
        print(template_response.text)
        sys.exit(1)
    
    template_id = template_response.json().get('id')
    print(f"Template created with ID: {template_id}")
    
    # Prepare meal template data with media files
    # Note: We're using multipart/form-data format for file uploads
    data = {
        "meal_name": "Media Test Meal",
        "meal_type": "lunch",
        "category": "test",
        "description": "Testing multiple media uploads",
        "calories": "300",
        "protein_grams": "20",
        "carbs_grams": "30",
        "fats_grams": "10",
        "preparation_time_minutes": "15",
        "cooking_time_minutes": "10",
        "recipe": "Test recipe instructions",
        "template": str(template_id),
        "ingredients": json.dumps([
            {
                "name": "Test Ingredient 1",
                "quantity": "100",
                "unit": "g",
                "category": "protein",
                "notes": "Test notes for ingredient 1"
            },
            {
                "name": "Test Ingredient 2",
                "quantity": "50",
                "unit": "ml",
                "category": "liquid",
                "notes": "Test notes for ingredient 2"
            }
        ])
    }
    
    # Find test images in the media directory
    media_dir = os.path.join("media", "meal_templates")
    available_images = []
    
    # Look for image files
    for root, dirs, files in os.walk("media"):
        for file in files:
            if file.lower().endswith((".jpg", ".jpeg", ".png", ".gif")):
                available_images.append(os.path.join(root, file))
    
    print(f"\nFound {len(available_images)} test images")
    
    # Prepare files for upload
    files = {}
    
    # Main image
    if available_images:
        main_image = available_images[0]
        print(f"Using main image: {main_image}")
        files['meal_image'] = (os.path.basename(main_image), open(main_image, 'rb'), 'image/jpeg')
    
    # Additional images (up to 3)
    for i, image_path in enumerate(available_images[1:4]):
        print(f"Adding additional image {i+1}: {image_path}")
        files[f'meal_images'] = (os.path.basename(image_path), open(image_path, 'rb'), 'image/jpeg')
    
    # Send request
    print("\nSending POST request for meal template creation with media...")
    response = requests.post(
        f"{base_url}/plan-management/api/v1/meal-templates/",
        data=data,
        files=files,
        headers=headers
    )
    
    # Close all file handles
    for file_field in files.values():
        if hasattr(file_field[1], 'close'):
            file_field[1].close()
    
    print(f"\nResponse status: {response.status_code}")
    try:
        response_data = response.json()
        print("Response JSON:")
        print(json.dumps(response_data, indent=2))
        
        # Check if media was saved properly
        if 'meal_images' in response_data:
            print(f"\nAdditional images count: {len(response_data['meal_images'])}")
            for idx, img in enumerate(response_data['meal_images']):
                print(f"  Image {idx+1}: {img}")
        else:
            print("\nNo additional images found in response")
            
        if 'meal_videos' in response_data:
            print(f"\nVideos count: {len(response_data['meal_videos'])}")
            for idx, video in enumerate(response_data['meal_videos']):
                print(f"  Video {idx+1}: {video}")
        else:
            print("\nNo videos found in response")
            
        return response_data
    except Exception as e:
        print(f"Error parsing response: {str(e)}")
        print(f"Raw response: {response.text}")
        return None

if __name__ == "__main__":
    test_create_meal_template_with_media()
