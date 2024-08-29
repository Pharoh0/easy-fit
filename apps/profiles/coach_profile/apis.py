from rest_framework import viewsets
from rest_framework import generics
from rest_framework.response import Response
from .models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture
from .serializers import CoachProfileSerializer, AvailabilitySerializer, CertificationSerializer, ClientPictureSerializer, CoachPictureSerializer
from cities_light.models import Country, Region, City
from .serializers import CountrySerializer, RegionSerializer, CitySerializer

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
    

# country, city, regions
# class RegionListView(generics.ListAPIView):
#     serializer_class = RegionSerializer
#
#     def get_queryset(self):
#         country_id = self.request.query_params.get('country')
#         if country_id:
#             return Region.objects.filter(country_id=country_id)
#         return Region.objects.none()
#
# class CityListView(generics.ListAPIView):
#     serializer_class = CitySerializer
#
#     def get_queryset(self):
#         region_id = self.request.query_params.get('region')
#         if (region_id):
#             return City.objects.filter(region_id=region_id)
#         return City.objects.none()

class RegionViewSet(viewsets.ViewSet):
    def list(self, request):
        country_id = request.query_params.get('country_id')
        if country_id:
            regions = Region.objects.filter(country_id=country_id)
        else:
            regions = Region.objects.all()
        serializer = RegionSerializer(regions, many=True)
        return Response(serializer.data)

class CityViewSet(viewsets.ViewSet):
    def list(self, request):
        region_id = request.query_params.get('region_id')
        if region_id:
            cities = City.objects.filter(region_id=region_id)
        else:
            cities = City.objects.all()
        serializer = CitySerializer(cities, many=True)
        return Response(serializer.data)
