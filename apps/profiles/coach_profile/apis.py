from rest_framework import viewsets
from .models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture
from .serializers import CoachProfileSerializer, AvailabilitySerializer, CertificationSerializer, ClientPictureSerializer, CoachPictureSerializer

class CoachProfileViewSet(viewsets.ModelViewSet):
    queryset = CoachProfile.objects.all()
    serializer_class = CoachProfileSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
        

class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer

class CertificationViewSet(viewsets.ModelViewSet):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer

class ClientPictureViewSet(viewsets.ModelViewSet):
    queryset = ClientPicture.objects.all()
    serializer_class = ClientPictureSerializer

class CoachPictureViewSet(viewsets.ModelViewSet):
    queryset = CoachPicture.objects.all()
    serializer_class = CoachPictureSerializer
