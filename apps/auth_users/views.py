from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import FormView, TemplateView, RedirectView
from django.http import JsonResponse
from django.shortcuts import redirect
from .forms import UserLoginForm, UserRegistrationForm

class UserLoginView(FormView):
    template_name = 'auth_users/login.html'
    form_class = UserLoginForm
    success_url = reverse_lazy('auth_users:dashboard')

    def form_valid(self, form):
        username = form.cleaned_data.get('username')
        password = form.cleaned_data.get('password')
        
        # Authenticate the user
        user = authenticate(self.request, username=username, password=password)
        
        if user is not None:
            # Log the user in
            login(self.request, user)
            return JsonResponse({'status': 'ok', 'redirect_url': str(self.success_url)})
        else:
            # If authentication fails, add a non-field error to the form
            form.add_error(None, "Invalid username or password.")
            return self.form_invalid(form)

    def form_invalid(self, form):
        # Return a 400 Bad Request status code with the form errors
        return JsonResponse({'status': 'error', 'errors': form.errors}, status=400)


class UserRegistrationView(FormView):
    template_name = 'auth_users/register.html'
    form_class = UserRegistrationForm
    success_url = reverse_lazy('user-login')

    def form_valid(self, form):
        form.save()
        return JsonResponse({'status': 'ok', 'redirect_url': str(self.success_url)})

    def form_invalid(self, form):
        return JsonResponse({'status': 'error', 'errors': form.errors})


class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = '../templates/dashboard.html'  # Ensure this is correct


class UserLogoutView(RedirectView):
    pattern_name = 'auth_users:user-login'

    def get(self, request, *args, **kwargs):
        logout(request)
        return redirect(self.pattern_name)



