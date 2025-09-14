
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.urls import reverse
from .models import ProductPlan

@login_required
def manage_product_plans(request):
    return render(request, 'coach/coach_product_plans.html')

@login_required
def view_plan(request, plan_id):
    """View details of a specific plan"""
    plan = get_object_or_404(ProductPlan, id=plan_id)
    
    # Check if user owns this plan or if plan is public
    if hasattr(request.user, 'coach_profile') and plan.coach == request.user.coach_profile:
        # Coach viewing their own plan
        is_owner = True
    elif plan.is_active:
        # Public plan view
        is_owner = False
    else:
        # Unauthorized access
        messages.error(request, "You don't have permission to view this plan.")
        return redirect('profiles:coach_profile')
    
    return render(request, 'plan_management/coach/view_plan.html', {
        'plan': plan,
        'is_owner': is_owner
    })

@login_required
def edit_plan(request, plan_id):
    """Edit a specific plan - only for plan owner"""
    plan = get_object_or_404(ProductPlan, id=plan_id)
    
    # Check if user owns this plan
    if not hasattr(request.user, 'coach_profile') or plan.coach != request.user.coach_profile:
        messages.error(request, "You don't have permission to edit this plan.")
        return redirect('profiles:coach_profile')
    
    # Redirect to plan creation page with plan ID for editing
    return redirect(f"/plan-management/coach/plan-creation/?plan_id={plan_id}")