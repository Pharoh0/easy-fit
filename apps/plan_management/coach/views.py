
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.urls import reverse

@login_required
def manage_product_plans(request):
    return render(request, 'coach/coach_product_plans.html')