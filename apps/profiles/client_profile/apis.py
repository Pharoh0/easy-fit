from rest_framework import viewsets
from .models import ClientProfile
from .serializers import ClientProfileSerializer


class ClientProfileViewSet(viewsets.ModelViewSet):
    queryset = ClientProfile.objects.all()
    serializer_class = ClientProfileSerializer

    def get_queryset(self):
        # Filter the queryset to only include the profile of the authenticated user
        return self.queryset.filter(user=self.request.user)

    def perform_update(self, serializer):
        # Ensure that the user field is not updated to another user
        serializer.save(user=self.request.user)