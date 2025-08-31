/**
 * Coach Plan Management API Service
 * Handles all API interactions for the coach plan management system
 */

const CoachPlanAPI = (() => {
    // API endpoints
    const API_ENDPOINTS = {
        productPlans: '/api/coach/product-plans/',
        planItems: '/api/coach/plan-items/',
        planTemplates: '/api/coach/plan-templates/',
        workoutTemplates: '/api/coach/workout-templates/',
        exerciseTemplates: '/api/coach/exercise-templates/',
        mealTemplates: '/api/coach/meal-templates/',
        planCustomization: '/api/coach/plan-customization/',
    };
    
    // Get authentication headers
    function getAuthHeaders(includeContentType = true) {
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        };
        
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        
        return headers;
    }
    
    // Handle API response
    function handleResponse(response) {
        if (response.ok) {
            return response.json();
        }
        
        // Handle error based on status code
        switch (response.status) {
            case 401:
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login/';
                break;
            case 403:
                // Forbidden
                throw new Error('You do not have permission to perform this action');
            case 404:
                // Not found
                throw new Error('Requested resource not found');
            default:
                // Other errors
                return response.json().then(errorData => {
                    throw new Error(errorData.detail || 'An error occurred');
                });
        }
    }
    
    // Product Plans API
    const productPlans = {
        getAll(params = {}) {
            const queryParams = new URLSearchParams();
            
            // Add query parameters
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            
            const url = `${API_ENDPOINTS.productPlans}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            return fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(handleResponse);
        },
        
        getById(planId) {
            return fetch(`${API_ENDPOINTS.productPlans}${planId}/`, {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(handleResponse);
        },
        
        create(planData) {
            return fetch(API_ENDPOINTS.productPlans, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            })
            .then(handleResponse);
        },
        
        update(planId, planData) {
            return fetch(`${API_ENDPOINTS.productPlans}${planId}/`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            })
            .then(handleResponse);
        },
        
        delete(planId) {
            return fetch(`${API_ENDPOINTS.productPlans}${planId}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    return handleResponse(response);
                }
                return { success: true };
            });
        },
        
        duplicate(planId) {
            return fetch(`${API_ENDPOINTS.productPlans}${planId}/duplicate/`, {
                method: 'POST',
                headers: getAuthHeaders()
            })
            .then(handleResponse);
        }
    };
    
    // Plan Items API
    const planItems = {
        getByPlanId(planId) {
            return fetch(`${API_ENDPOINTS.planItems}?plan=${planId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(handleResponse);
        },
        
        create(itemData) {
            return fetch(API_ENDPOINTS.planItems, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(itemData)
            })
            .then(handleResponse);
        },
        
        update(itemId, itemData) {
            return fetch(`${API_ENDPOINTS.planItems}${itemId}/`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(itemData)
            })
            .then(handleResponse);
        },
        
        delete(itemId) {
            return fetch(`${API_ENDPOINTS.planItems}${itemId}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    return handleResponse(response);
                }
                return { success: true };
            });
        }
    };
    
    // Templates API (generic template handling)
    function createTemplateAPI(endpoint) {
        return {
            getAll(params = {}) {
                const queryParams = new URLSearchParams();
                
                // Add query parameters
                Object.keys(params).forEach(key => {
                    if (params[key] !== null && params[key] !== undefined) {
                        queryParams.append(key, params[key]);
                    }
                });
                
                const url = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
                
                return fetch(url, {
                    method: 'GET',
                    headers: getAuthHeaders()
                })
                .then(handleResponse);
            },
            
            getById(templateId) {
                return fetch(`${endpoint}${templateId}/`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                })
                .then(handleResponse);
            },
            
            create(templateData) {
                return fetch(endpoint, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(templateData)
                })
                .then(handleResponse);
            },
            
            update(templateId, templateData) {
                return fetch(`${endpoint}${templateId}/`, {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(templateData)
                })
                .then(handleResponse);
            },
            
            delete(templateId) {
                return fetch(`${endpoint}${templateId}/`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                })
                .then(response => {
                    if (!response.ok) {
                        return handleResponse(response);
                    }
                    return { success: true };
                });
            }
        };
    }
    
    // Create API for each template type
    const planTemplates = createTemplateAPI(API_ENDPOINTS.planTemplates);
    const workoutTemplates = createTemplateAPI(API_ENDPOINTS.workoutTemplates);
    const exerciseTemplates = createTemplateAPI(API_ENDPOINTS.exerciseTemplates);
    const mealTemplates = createTemplateAPI(API_ENDPOINTS.mealTemplates);
    
    // Plan Customization API
    const planCustomization = {
        customizePlanDay(subscriptionId, planDayId, customizationData) {
            return fetch(`${API_ENDPOINTS.planCustomization}${subscriptionId}/customize_plan_day/${planDayId}/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(customizationData)
            })
            .then(handleResponse);
        },
        
        applyTemplate(subscriptionId, planDayId, templateData) {
            return fetch(`${API_ENDPOINTS.planCustomization}${subscriptionId}/apply_template/${planDayId}/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(templateData)
            })
            .then(handleResponse);
        },
        
        clientProgressSummary(params = {}) {
            const queryParams = new URLSearchParams();
            
            // Add query parameters
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            
            const url = `${API_ENDPOINTS.planCustomization}client_progress_summary/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            
            return fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            })
            .then(handleResponse);
        }
    };
    
    // File upload helper
    function uploadFile(endpoint, file, metadata = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add metadata
        Object.keys(metadata).forEach(key => {
            formData.append(key, metadata[key]);
        });
        
        return fetch(endpoint, {
            method: 'POST',
            headers: getAuthHeaders(false), // Don't include Content-Type for FormData
            body: formData
        })
        .then(handleResponse);
    }
    
    // Error handler helper
    function handleApiError(error, fallbackMessage = 'An error occurred') {
        console.error(error);
        return {
            error: true,
            message: error.message || fallbackMessage
        };
    }
    
    // Public API
    return {
        productPlans,
        planItems,
        planTemplates,
        workoutTemplates,
        exerciseTemplates,
        mealTemplates,
        planCustomization,
        uploadFile,
        handleApiError
    };
})();

// Export for use in other files
if (typeof module !== 'undefined') {
    module.exports = CoachPlanAPI;
}
