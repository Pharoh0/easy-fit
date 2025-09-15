from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class StaffAccessTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = 'pass1234'
        # Create a client user (non-staff)
        self.client_user = User.objects.create_user(
            username='client1', email='client1@example.com', password=self.password, user_type='client'
        )
        # Create a staff user
        self.staff_user = User.objects.create_user(
            username='staff1', email='staff1@example.com', password=self.password, user_type='staff'
        )

    def test_client_user_cannot_access_staff_ui(self):
        self.client.login(username=self.client_user.username, password=self.password)
        resp = self.client.get(reverse('staff:dashboard'))
        self.assertEqual(resp.status_code, 403)

    def test_staff_user_can_access_staff_ui(self):
        self.client.login(username=self.staff_user.username, password=self.password)
        resp = self.client.get(reverse('staff:dashboard'))
        self.assertEqual(resp.status_code, 200)
