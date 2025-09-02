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
            # Check if user is blocked (is_active=False)
            if not user.is_active:
                # Get block reason if available
                block_reason = getattr(user, 'block_reason', 'Your account has been blocked by an administrator.')
                blocked_at = getattr(user, 'blocked_at', None)
                
                # Format block message with reason and date if available
                block_message = f"Account blocked: {block_reason}"
                if blocked_at:
                    block_message += f" (blocked on {blocked_at.strftime('%Y-%m-%d')})"
                
                # Redirect to blocked page with reason
                return JsonResponse({
                    'status': 'blocked',
                    'message': block_message,
                    'redirect_url': reverse_lazy('auth_users:blocked')
                })
            
            # User is active, log them in
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
    success_url = reverse_lazy('auth_users:user-login')

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


class BlockedView(TemplateView):
    template_name = 'auth_users/blocked.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        if user.is_authenticated:
            context['reason'] = getattr(user, 'block_reason', 'Your account has been blocked by an administrator.')
            context['blocked_at'] = getattr(user, 'blocked_at', None)
            context['user'] = user
        
        return context
