from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PlanRating, RatingHelpfulness, CoachRatingStats

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for ratings"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RatingHelpfulnessSerializer(serializers.ModelSerializer):
    """Serializer for rating helpfulness votes"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = RatingHelpfulness
        fields = ['id', 'user', 'is_helpful', 'voted_at']
        read_only_fields = ['id', 'user', 'voted_at']


class PlanRatingSerializer(serializers.ModelSerializer):
    """Serializer for plan ratings"""
    client = UserBasicSerializer(read_only=True)
    coach_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    helpfulness_votes = RatingHelpfulnessSerializer(many=True, read_only=True)
    helpfulness_summary = serializers.SerializerMethodField()
    user_helpfulness_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanRating
        fields = [
            'id', 'client', 'coach_name', 'plan_name', 'overall_rating',
            'effectiveness_rating', 'communication_rating', 'value_for_money_rating',
            'average_rating', 'review_title', 'review_content', 'created_at',
            'is_verified', 'is_public', 'coach_response', 'coach_responded_at',
            'helpfulness_votes', 'helpfulness_summary', 'user_helpfulness_vote'
        ]
        read_only_fields = [
            'id', 'client', 'created_at', 'is_verified', 'average_rating',
            'coach_responded_at'
        ]
    
    def get_coach_name(self, obj):
        """Get coach's full name"""
        return obj.coach.user.get_full_name() or obj.coach.user.username
    
    def get_plan_name(self, obj):
        """Get plan name"""
        return obj.subscription.product_plan.name
    
    def get_helpfulness_summary(self, obj):
        """Get helpfulness vote summary"""
        votes = obj.helpfulness_votes.all()
        helpful_count = votes.filter(is_helpful=True).count()
        total_votes = votes.count()
        
        return {
            'helpful_count': helpful_count,
            'not_helpful_count': total_votes - helpful_count,
            'total_votes': total_votes,
            'helpfulness_percentage': (helpful_count / total_votes * 100) if total_votes > 0 else 0
        }
    
    def get_user_helpfulness_vote(self, obj):
        """Get current user's helpfulness vote if any"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.helpfulness_votes.filter(user=request.user).first()
            if vote:
                return vote.is_helpful
        return None
    
    def create(self, validated_data):
        """Create rating with current user as client"""
        request = self.context.get('request')
        validated_data['client'] = request.user
        
        # Get subscription from context or request
        subscription = self.context.get('subscription')
        if not subscription:
            subscription_id = self.context.get('subscription_id')
            if subscription_id:
                from ..client.models import PlanSubscription
                subscription = PlanSubscription.objects.get(id=subscription_id)
        
        if subscription:
            validated_data['subscription'] = subscription
            validated_data['coach'] = subscription.product_plan.coach
        
        return super().create(validated_data)


class PlanRatingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating plan ratings"""
    
    class Meta:
        model = PlanRating
        fields = [
            'overall_rating', 'effectiveness_rating', 'communication_rating',
            'value_for_money_rating', 'review_title', 'review_content', 'is_public'
        ]
    
    def validate(self, data):
        """Validate rating data"""
        # Ensure all ratings are between 1-5
        rating_fields = ['overall_rating', 'effectiveness_rating', 'communication_rating', 'value_for_money_rating']
        for field in rating_fields:
            if field in data and (data[field] < 1 or data[field] > 5):
                raise serializers.ValidationError(f"{field} must be between 1 and 5")
        
        return data


class CoachResponseSerializer(serializers.Serializer):
    """Serializer for coach responses to ratings"""
    response = serializers.CharField(max_length=1000)
    
    def validate_response(self, value):
        """Validate coach response"""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Response must be at least 10 characters long")
        return value.strip()


class CoachRatingStatsSerializer(serializers.ModelSerializer):
    """Serializer for coach rating statistics"""
    coach_name = serializers.SerializerMethodField()
    rating_distribution = serializers.SerializerMethodField()
    recent_ratings = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachRatingStats
        fields = [
            'total_ratings', 'average_overall_rating', 'average_effectiveness_rating',
            'average_communication_rating', 'average_value_rating', 'five_star_count',
            'four_star_count', 'three_star_count', 'two_star_count', 'one_star_count',
            'response_rate', 'average_response_time_hours', 'last_updated',
            'coach_name', 'rating_distribution', 'recent_ratings'
        ]
    
    def get_coach_name(self, obj):
        """Get coach's full name"""
        return obj.coach.user.get_full_name() or obj.coach.user.username
    
    def get_rating_distribution(self, obj):
        """Get rating distribution as percentages"""
        total = obj.total_ratings
        if total == 0:
            return {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        return {
            5: round((obj.five_star_count / total) * 100, 1),
            4: round((obj.four_star_count / total) * 100, 1),
            3: round((obj.three_star_count / total) * 100, 1),
            2: round((obj.two_star_count / total) * 100, 1),
            1: round((obj.one_star_count / total) * 100, 1)
        }
    
    def get_recent_ratings(self, obj):
        """Get recent ratings for this coach"""
        recent_ratings = obj.coach.received_ratings.filter(is_public=True).order_by('-created_at')[:5]
        return PlanRatingSerializer(recent_ratings, many=True, context=self.context).data


class RatingHelpfulnessCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating helpfulness votes"""
    
    class Meta:
        model = RatingHelpfulness
        fields = ['is_helpful']
    
    def create(self, validated_data):
        """Create helpfulness vote with current user"""
        request = self.context.get('request')
        rating = self.context.get('rating')
        
        # Check if user already voted
        existing_vote = RatingHelpfulness.objects.filter(
            rating=rating,
            user=request.user
        ).first()
        
        if existing_vote:
            # Update existing vote
            existing_vote.is_helpful = validated_data['is_helpful']
            existing_vote.save()
            return existing_vote
        else:
            # Create new vote
            return RatingHelpfulness.objects.create(
                rating=rating,
                user=request.user,
                is_helpful=validated_data['is_helpful']
            )


class RatingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for rating lists"""
    client_name = serializers.SerializerMethodField()
    coach_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    
    class Meta:
        model = PlanRating
        fields = [
            'id', 'client_name', 'coach_name', 'plan_name', 'overall_rating',
            'average_rating', 'review_title', 'created_at', 'is_verified',
            'coach_response'
        ]
    
    def get_client_name(self, obj):
        """Get client's name (anonymized if needed)"""
        if obj.is_public:
            return obj.client.get_full_name() or obj.client.username
        return "Anonymous User"
    
    def get_coach_name(self, obj):
        """Get coach's full name"""
        return obj.coach.user.get_full_name() or obj.coach.user.username
    
    def get_plan_name(self, obj):
        """Get plan name"""
        return obj.subscription.product_plan.name
