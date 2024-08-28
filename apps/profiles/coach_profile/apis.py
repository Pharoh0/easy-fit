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
    
    def get_queryset(self):
        # Get the currently authenticated user's coach profile
        coach_profile = self.request.user.coach_profile
        # Return only the availabilities related to the user's coach profile
        return Availability.objects.filter(coach_profile=coach_profile)

    # def perform_create(self, serializer):
    #     # Automatically associate the new availability with the user's coach profile
    #     serializer.save(coach_profile=self.request.user.coach_profile)
        
    def perform_create(self, serializer):
        try:
            # Automatically associate the new availability with the user's coach profile
            serializer.save(coach_profile=self.request.user.coach_profile)
            print("Data saved successfully")
        except Exception as e:
            print(f"Error saving data: {str(e)}")
    

class CertificationViewSet(viewsets.ModelViewSet):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer

    
    def get_queryset(self):
        # Get the currently authenticated user's coach profile
        coach_profile = self.request.user.coach_profile
        # Return only the certifications related to the user's coach profile
        return Certification.objects.filter(coach_profile=coach_profile)

    def perform_create(self, serializer):
        # Automatically associate the new certification with the user's coach profile
        serializer.save(coach_profile=self.request.user.coach_profile)
    


class ClientPictureViewSet(viewsets.ModelViewSet):
    queryset = ClientPicture.objects.all()
    serializer_class = ClientPictureSerializer
    
    def get_queryset(self):
        # Get the currently authenticated user's coach profile
        coach_profile = self.request.user.coach_profile
        # Return only the client pictures related to the user's coach profile
        return ClientPicture.objects.filter(coach_profile=coach_profile)

    def perform_create(self, serializer):
        # Automatically associate the new client picture with the user's coach profile
        serializer.save(coach_profile=self.request.user.coach_profile)
        
    def perform_update(self, serializer):
        # Update the instance, allowing partial updates
        serializer.save(coach_profile=self.request.user.coach_profile)
    


class CoachPictureViewSet(viewsets.ModelViewSet):
    queryset = CoachPicture.objects.all()
    serializer_class = CoachPictureSerializer
    
    def get_queryset(self):
        # Get the currently authenticated user's coach profile
        coach_profile = self.request.user.coach_profile
        # Return only the coach pictures related to the user's coach profile
        return CoachPicture.objects.filter(coach_profile=coach_profile)

    def perform_create(self, serializer):
        # serializer.save(coach_profile=self.request.user.coach_profile
        try:
            # Automatically associate the new availability with the user's coach profile
            serializer.save(coach_profile=self.request.user.coach_profile)
            print("Data saved successfully")
        except Exception as e:
            print(f"Error saving data: {str(e)}")
    
