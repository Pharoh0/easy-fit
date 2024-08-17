from rest_framework import viewsets
from .models import ClientProfile
from .serializers import ClientProfileSerializer


class ClientProfileViewSet(viewsets.ModelViewSet):
    queryset = ClientProfile.objects.all()
    serializer_class = ClientProfileSerializer

    def get_queryset(self):
        # Ensure this filters based on the currently authenticated user or other conditions
        return self.queryset.filter(user=self.request.user)