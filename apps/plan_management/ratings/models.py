from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


class PlanRating(models.Model):
    """Client ratings for completed plans"""
    subscription = models.OneToOneField('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='rating')
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_ratings')
    coach = models.ForeignKey('profiles.CoachProfile', on_delete=models.CASCADE, related_name='received_ratings')
    
    # Rating categories (1-5 scale)
    overall_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    effectiveness_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    communication_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    value_for_money_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Written review
    review_title = models.CharField(max_length=255, blank=True)
    review_content = models.TextField()
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=True)  # Verified purchase
    is_public = models.BooleanField(default=True)
    
    # Coach response
    coach_response = models.TextField(blank=True)
    coach_responded_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Rating by {self.client.username} for {self.subscription.product_plan.name} - {self.overall_rating}/5"
    
    @property
    def average_rating(self):
        """Calculate average rating across all categories"""
        return (self.overall_rating + self.effectiveness_rating + 
                self.communication_rating + self.value_for_money_rating) / 4
    
    def respond_as_coach(self, response_text):
        """Allow coach to respond to rating"""
        self.coach_response = response_text
        self.coach_responded_at = timezone.now()
        self.save()
    
    class Meta:
        ordering = ['-created_at']


class RatingHelpfulness(models.Model):
    """Track if other users find ratings helpful"""
    rating = models.ForeignKey(PlanRating, on_delete=models.CASCADE, related_name='helpfulness_votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_helpful = models.BooleanField()
    voted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        helpful_text = "helpful" if self.is_helpful else "not helpful"
        return f"{self.user.username} found rating {helpful_text}"
    
    class Meta:
        unique_together = ['rating', 'user']
        ordering = ['-voted_at']


class CoachRatingStats(models.Model):
    """Aggregated rating statistics for coaches"""
    coach = models.OneToOneField('profiles.CoachProfile', on_delete=models.CASCADE, related_name='rating_stats')
    
    # Overall statistics
    total_ratings = models.PositiveIntegerField(default=0)
    average_overall_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    average_effectiveness_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    average_communication_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    average_value_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    
    # Rating distribution (count of each star rating)
    five_star_count = models.PositiveIntegerField(default=0)
    four_star_count = models.PositiveIntegerField(default=0)
    three_star_count = models.PositiveIntegerField(default=0)
    two_star_count = models.PositiveIntegerField(default=0)
    one_star_count = models.PositiveIntegerField(default=0)
    
    # Response statistics
    response_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage
    average_response_time_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Rating Stats for {self.coach.user.username} - {self.average_overall_rating}/5"
    
    def update_stats(self):
        """Recalculate all rating statistics"""
        ratings = self.coach.received_ratings.all()
        
        if not ratings.exists():
            return
        
        # Basic counts
        self.total_ratings = ratings.count()
        
        # Average ratings
        self.average_overall_rating = ratings.aggregate(
            avg=models.Avg('overall_rating'))['avg'] or 0
        self.average_effectiveness_rating = ratings.aggregate(
            avg=models.Avg('effectiveness_rating'))['avg'] or 0
        self.average_communication_rating = ratings.aggregate(
            avg=models.Avg('communication_rating'))['avg'] or 0
        self.average_value_rating = ratings.aggregate(
            avg=models.Avg('value_for_money_rating'))['avg'] or 0
        
        # Star distribution
        self.five_star_count = ratings.filter(overall_rating=5).count()
        self.four_star_count = ratings.filter(overall_rating=4).count()
        self.three_star_count = ratings.filter(overall_rating=3).count()
        self.two_star_count = ratings.filter(overall_rating=2).count()
        self.one_star_count = ratings.filter(overall_rating=1).count()
        
        # Response statistics
        responded_ratings = ratings.exclude(coach_response='')
        self.response_rate = (responded_ratings.count() / self.total_ratings) * 100 if self.total_ratings > 0 else 0
        
        self.save()
    
    class Meta:
        verbose_name = "Coach Rating Statistics"
        verbose_name_plural = "Coach Rating Statistics"
