from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.profiles.client_profile.models import (
    ClientMeasurement, 
    BodyPart, 
    BodyPartMeasurement
)
from .serializers import (
    ClientMeasurementSerializer,
    EnhancedClientMeasurementSerializer,
    BodyPartSerializer,
    BodyPartMeasurementSerializer
)


class BodyPartViewSet(viewsets.ModelViewSet):
    """ViewSet for managing body parts"""
    queryset = BodyPart.objects.all()
    serializer_class = BodyPartSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_default']
    search_fields = ['name', 'display_name', 'description']
    ordering_fields = ['name', 'category', 'sort_order']
    ordering = ['category', 'sort_order', 'name']
    
    def get_queryset(self):
        """
        Customize queryset based on request parameters
        """
        queryset = super().get_queryset()
        
        # Filter for default/custom body parts
        is_default = self.request.query_params.get('is_default')
        if is_default is not None:
            queryset = queryset.filter(is_default=(is_default.lower() == 'true'))
            
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset


class BodyPartMeasurementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing body part measurements"""
    queryset = BodyPartMeasurement.objects.all()
    serializer_class = BodyPartMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['measurement', 'body_part']
    ordering_fields = ['created_at', 'body_part__category', 'body_part__sort_order']
    ordering = ['body_part__category', 'body_part__sort_order']
    
    def get_queryset(self):
        """
        Filter measurements by client if requested
        """
        queryset = super().get_queryset()
        
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(measurement__client_id=client_id)
            
        return queryset


class EnhancedClientMeasurementViewSet(viewsets.ModelViewSet):
    """Enhanced ViewSet for client measurements with body part measurements"""
    queryset = ClientMeasurement.objects.all()
    serializer_class = EnhancedClientMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['client', 'date']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action
        """
        if self.action in ['list', 'retrieve']:
            return EnhancedClientMeasurementSerializer
        return ClientMeasurementSerializer
    
    def get_queryset(self):
        """
        Filter measurements by client and/or date range
        """
        queryset = super().get_queryset()
        
        # Filter by client
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
            
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset
    
    def perform_create(self, serializer):
        """
        Set client from request if not provided
        """
        client_id = self.request.data.get('client')
        serializer.save(client_id=client_id)
    
    @action(detail=True, methods=['get'])
    def body_parts(self, request, pk=None):
        """
        Get all body part measurements for a specific measurement
        """
        measurement = self.get_object()
        body_part_measurements = BodyPartMeasurement.objects.filter(measurement=measurement)
        serializer = BodyPartMeasurementSerializer(body_part_measurements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """
        Get the latest measurement for a client
        """
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({"error": "client_id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            measurement = ClientMeasurement.objects.filter(client_id=client_id).latest('date')
            serializer = self.get_serializer(measurement)
            return Response(serializer.data)
        except ClientMeasurement.DoesNotExist:
            return Response({"error": "No measurements found for this client"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """
        Get client measurement progress over time
        """
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({"error": "client_id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        measurements = ClientMeasurement.objects.filter(client_id=client_id).order_by('date')
        
        # Specify body parts to track if needed
        body_part_ids = request.query_params.getlist('body_part_ids')
        
        if measurements.exists():
            # Structure for tracking progress data
            progress_data = {
                'measurements': [],
                'body_parts': {}
            }
            
            # Get data for each measurement
            for measurement in measurements:
                # Get basic measurement data
                measurement_data = {
                    'id': measurement.id,
                    'date': measurement.date,
                    'weight': measurement.weight,
                    'body_fat_percentage': measurement.body_fat_percentage
                }
                
                # Get body part measurements
                body_part_query = measurement.body_part_measurements.all()
                if body_part_ids:
                    body_part_query = body_part_query.filter(body_part_id__in=body_part_ids)
                    
                # Add to the data structure
                for bpm in body_part_query:
                    if str(bpm.body_part.id) not in progress_data['body_parts']:
                        progress_data['body_parts'][str(bpm.body_part.id)] = {
                            'name': bpm.body_part.name,
                            'display_name': bpm.body_part.display_name or bpm.body_part.name,
                            'category': bpm.body_part.category,
                            'values': []
                        }
                    
                    progress_data['body_parts'][str(bpm.body_part.id)]['values'].append({
                        'date': measurement.date,
                        'value': float(bpm.value),
                        'unit': bpm.unit
                    })
                
                progress_data['measurements'].append(measurement_data)
            
            return Response(progress_data)
        else:
            return Response({"error": "No measurements found for this client"}, status=status.HTTP_404_NOT_FOUND)
