/**
 * Coach Plan Management API Service
 * Handles all API interactions for the coach plan management system
 */

const CoachPlanAPI = (() => {
    // API endpoints
    const API_ENDPOINTS = {
        productPlans: '/plan-management/api/v1/product-plans/',
        planItems: '/plan-management/api/v1/plan-items/',
        planTemplates: '/plan-management/api/v1/plan-templates/',
        workoutTemplates: '/plan-management/api/v1/workout-templates/',
        exerciseTemplates: '/plan-management/api/v1/exercise-templates/',
        mealTemplates: '/plan-management/api/v1/meal-templates/',
        planCustomization: '/plan-management/api/v1/coach-plan-customization/',
    };
    
    // Get authentication headers
    function getAuthHeaders(includeContentType = true) {
        // Prefer APIBase unified token storage; fall back to legacy keys
        const token = (typeof APIBase !== 'undefined')
            ? APIBase.getJWTToken()
            : (localStorage.getItem('access_token') || localStorage.getItem('jwt_token') || localStorage.getItem('token'));
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (includeContentType) headers['Content-Type'] = 'application/json';
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
                // Let APIBase handle login redirect if available; otherwise fallback
                try {
                    const loginUrl = (window.LOGIN_URL || '/auth-users/login/');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('jwt_token');
                    const nextUrl = encodeURIComponent(window.location.href);
                    if (window.location.pathname !== loginUrl) {
                        window.location.href = `${loginUrl}?next=${nextUrl}`;
                    }
                } catch (e) {
                    window.location.href = '/auth-users/login/';
                }
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
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            const url = `${API_ENDPOINTS.productPlans}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            return APIBase.request(url, { method: 'GET' })
                .then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to load product plans');
                });
        },
        
        getById(planId) {
            return APIBase.request(`${API_ENDPOINTS.productPlans}${planId}/`, { method: 'GET' })
                .then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to load plan');
                });
        },
        
        create(planData) {
            return APIBase.request(API_ENDPOINTS.productPlans, {
                method: 'POST',
                body: JSON.stringify(planData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to create plan');
            });
        },
        
        update(planId, planData) {
            return APIBase.request(`${API_ENDPOINTS.productPlans}${planId}/`, {
                method: 'PATCH',
                body: JSON.stringify(planData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to update plan');
            });
        },
        
        delete(planId) {
            return APIBase.request(`${API_ENDPOINTS.productPlans}${planId}/`, { method: 'DELETE' })
                .then(res => {
                    if (res && res.success) return { success: true };
                    throw new Error((res && res.error) || 'Failed to delete plan');
                });
        },
        
        duplicate(planId) {
            return APIBase.request(`${API_ENDPOINTS.productPlans}${planId}/duplicate/`, { method: 'POST' })
                .then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to duplicate plan');
                });
        }
    };
    
    // Plan Items API
    const planItems = {
        getByPlanId(planId) {
            return APIBase.request(`${API_ENDPOINTS.planItems}?plan=${planId}`, { method: 'GET' })
                .then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to load plan items');
                });
        },
        
        create(itemData) {
            return APIBase.request(API_ENDPOINTS.planItems, {
                method: 'POST',
                body: JSON.stringify(itemData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to create plan item');
            });
        },
        
        update(itemId, itemData) {
            return APIBase.request(`${API_ENDPOINTS.planItems}${itemId}/`, {
                method: 'PATCH',
                body: JSON.stringify(itemData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to update plan item');
            });
        },
        
        delete(itemId) {
            return APIBase.request(`${API_ENDPOINTS.planItems}${itemId}/`, { method: 'DELETE' })
                .then(res => {
                    if (res && res.success) return { success: true };
                    throw new Error((res && res.error) || 'Failed to delete plan item');
                });
        }
    };
    
    // Templates API (generic template handling)
    function createTemplateAPI(endpoint) {
        return {
            getAll(params = {}) {
                const queryParams = new URLSearchParams();
                Object.keys(params).forEach(key => {
                    if (params[key] !== null && params[key] !== undefined) {
                        queryParams.append(key, params[key]);
                    }
                });
                const url = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
                return APIBase.request(url, { method: 'GET' })
                    .then(res => {
                        if (res && res.success) return res.data;
                        throw new Error((res && res.error) || 'Failed to load templates');
                    });
            },
            
            getById(templateId) {
                return APIBase.request(`${endpoint}${templateId}/`, { method: 'GET' })
                    .then(res => {
                        if (res && res.success) return res.data;
                        throw new Error((res && res.error) || 'Failed to load template');
                    });
            },
            
            create(templateData) {
                return APIBase.request(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(templateData)
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to create template');
                });
            },
            
            update(templateId, templateData) {
                return APIBase.request(`${endpoint}${templateId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify(templateData)
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to update template');
                });
            },
            
            delete(templateId) {
                return APIBase.request(`${endpoint}${templateId}/`, { method: 'DELETE' })
                    .then(res => {
                        if (res && res.success) return { success: true };
                        throw new Error((res && res.error) || 'Failed to delete template');
                    });
            }
        };
    }
    
    // Create API for each template type
    const planTemplates = createTemplateAPI(API_ENDPOINTS.planTemplates);
    const workoutTemplates = createTemplateAPI(API_ENDPOINTS.workoutTemplates);
    const exerciseTemplates = createTemplateAPI(API_ENDPOINTS.exerciseTemplates);
    
    // Meal templates API with special handling for multipart/form-data
    const mealTemplates = {
        ...createTemplateAPI(API_ENDPOINTS.mealTemplates),
        
        // Override create method to support FormData
        create(templateData, isMultipart = false) {
            if (!isMultipart) {
                // Use standard JSON request
                return APIBase.request(API_ENDPOINTS.mealTemplates, {
                    method: 'POST',
                    body: JSON.stringify(templateData)
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to create meal template');
                });
            } else {
                // Use multipart/form-data request (no Content-Type header)
                return APIBase.request(API_ENDPOINTS.mealTemplates, {
                    method: 'POST',
                    body: templateData,
                    headers: {
                        // Let browser set correct Content-Type with boundary
                        'Content-Type': null
                    }
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to create meal template');
                });
            }
        },
        
        // Override update method to support FormData
        update(templateId, templateData, isMultipart = false) {
            if (!isMultipart) {
                // Use standard JSON request
                return APIBase.request(`${API_ENDPOINTS.mealTemplates}${templateId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify(templateData)
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to update meal template');
                });
            } else {
                // Use multipart/form-data request (no Content-Type header)
                return APIBase.request(`${API_ENDPOINTS.mealTemplates}${templateId}/`, {
                    method: 'PATCH',
                    body: templateData,
                    headers: {
                        // Let browser set correct Content-Type with boundary
                        'Content-Type': null
                    }
                }).then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to update meal template');
                });
            }
        }
    };
    
    // Plan Customization API
    const planCustomization = {
        customizePlanDay(subscriptionId, planDayId, customizationData) {
            return APIBase.request(`${API_ENDPOINTS.planCustomization}${subscriptionId}/customize_plan_day/${planDayId}/`, {
                method: 'POST',
                body: JSON.stringify(customizationData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to customize plan day');
            });
        },
        
        applyTemplate(subscriptionId, planDayId, templateData) {
            return APIBase.request(`${API_ENDPOINTS.planCustomization}${subscriptionId}/apply_template/${planDayId}/`, {
                method: 'POST',
                body: JSON.stringify(templateData)
            }).then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'Failed to apply template');
            });
        },
        
        clientProgressSummary(params = {}) {
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            const url = `${API_ENDPOINTS.planCustomization}client_progress_summary/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            return APIBase.request(url, { method: 'GET' })
                .then(res => {
                    if (res && res.success) return res.data;
                    throw new Error((res && res.error) || 'Failed to load client progress summary');
                });
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
        // APIBase.request will drop Content-Type so browser can set boundary
        return APIBase.request(endpoint, { method: 'POST', body: formData })
            .then(res => {
                if (res && res.success) return res.data;
                throw new Error((res && res.error) || 'File upload failed');
            });
    }
    
    // Error handler helper
    function handleApiError(error, fallbackMessage = 'An error occurred') {
        console.error(error);
        return {
            error: true,
            message: error.message || fallbackMessage
        };
    }
    
    // Coach profile cache
    let currentCoachProfile = null;

    /**
     * Get the current coach profile ID
     * @returns {Promise<number>} Coach profile ID
     */
    async function getCurrentCoachProfile() {
        // Return from cache if available
        if (currentCoachProfile !== null) {
            return currentCoachProfile;
        }

        try {
            // Try to get profile from plan templates
            const templates = await planTemplates.getAll({limit: 1});
            if (templates && templates.results && templates.results.length > 0) {
                currentCoachProfile = templates.results[0].coach;
                return currentCoachProfile;
            }

            // If no templates, try workout templates
            const workoutTpls = await workoutTemplates.getAll({limit: 1});
            if (workoutTpls && workoutTpls.results && workoutTpls.results.length > 0) {
                currentCoachProfile = workoutTpls.results[0].template.coach;
                return currentCoachProfile;
            }

            // If no workout templates, try meal templates
            const mealTpls = await mealTemplates.getAll({limit: 1});
            if (mealTpls && mealTpls.results && mealTpls.results.length > 0) {
                currentCoachProfile = mealTpls.results[0].template.coach;
                return currentCoachProfile;
            }

            // If all else fails, try product plans
            const plans = await productPlans.getAll({limit: 1});
            if (plans && plans.results && plans.results.length > 0) {
                currentCoachProfile = plans.results[0].coach;
                return currentCoachProfile;
            }

            console.error('Could not determine coach profile ID');
            return null;
        } catch (error) {
            console.error('Error getting coach profile ID:', error);
            return null;
        }
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
        handleApiError,
        getCurrentCoachProfile
    };
})();

// Export for use in other files
if (typeof module !== 'undefined') {
    module.exports = CoachPlanAPI;
}
