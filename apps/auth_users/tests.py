from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from urllib.parse import urlparse


User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetFlowTests(TestCase):
	def setUp(self):
		self.user_email = 'john@example.com'
		self.username = 'john'
		self.password = 'StrongPass!123'
		self.user = User.objects.create_user(
			username=self.username,
			email=self.user_email,
			password=self.password,
			is_active=True,
		)

	def test_password_reset_request_sends_email(self):
		url = reverse('auth_users:password_reset')
		resp = self.client.post(url, {'email': self.user_email})
		# Should redirect to done page
		self.assertRedirects(resp, reverse('auth_users:password_reset_done'))
		# Email should be sent
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Reset your Easy Fit password', mail.outbox[0].subject)
		self.assertIn(self.user_email, mail.outbox[0].to)

	def test_password_reset_confirm_changes_password(self):
		# Trigger reset to generate email
		self.client.post(reverse('auth_users:password_reset'), {'email': self.user_email})
		self.assertEqual(len(mail.outbox), 1)
		email_body = mail.outbox[0].body

		# Extract reset link from email body (assumes unique URL present)
		# Find the first http link line in the email body
		reset_link = None
		for line in email_body.splitlines():
			if line.startswith('http://') or line.startswith('https://'):
				reset_link = line.strip()
				break
		self.assertIsNotNone(reset_link, 'No reset link found in email body')

		# Visit reset link (GET)
		get_resp = self.client.get(reset_link)
		self.assertEqual(get_resp.status_code, 200)

		# Post new password
		new_password = 'NewStrongPass!456'
		post_resp = self.client.post(reset_link, {
			'new_password1': new_password,
			'new_password2': new_password,
		})
		# Should redirect to complete page
		self.assertRedirects(post_resp, reverse('auth_users:password_reset_complete'))

		# Verify we can log in with the new password
		login_ok = self.client.login(username=self.username, password=new_password)
		self.assertTrue(login_ok)

