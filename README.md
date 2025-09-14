# Easy Fit

A comprehensive fitness and nutrition management application built with Django. This platform connects fitness coaches with clients, providing tools for plan management, nutrition tracking, and progress monitoring.

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Git
- Redis (for real-time messaging and caching)

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Pharoh0/easy-fit.git
cd easy-fit
```

#### 2. Create Virtual Environment

**On Windows (PowerShell):**
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**
```cmd
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate.bat
```

**On macOS/Linux:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Environment Setup

Create a `.env` file in the project root directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3

# Redis settings (if using Redis)
REDIS_URL=redis://localhost:6379/0

# Email settings (optional for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

#### 5. Database Setup

```bash
# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

#### 6. Run the Development Server

```bash
python manage.py runserver
```

The application will be available at `http://127.0.0.1:8000/`

## 📁 Project Structure

```
easy-fit/
├── apps/                           # Django applications
│   ├── auth_users/                # User authentication and management
│   ├── messaging/                 # Real-time messaging system
│   ├── plan_management/           # Fitness and nutrition plans
│   ├── profiles/                  # User profiles (client/coach/staff)
│   ├── search/                    # Search functionality
│   ├── staff/                     # Staff management
│   └── user_friendship/           # Social features
├── docs/                          # Documentation
├── ezay_fit/                      # Main Django project settings
├── media/                         # User uploaded files
├── static/                        # Static files (CSS, JS, images)
├── templates/                     # HTML templates
├── manage.py                      # Django management script
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

## 🛠️ Development

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.auth_users
```

### Collecting Static Files

```bash
python manage.py collectstatic
```

### Creating Database Migrations

```bash
# Create migrations for all apps
python manage.py makemigrations

# Create migrations for specific app
python manage.py makemigrations auth_users
```

## 🔧 Additional Setup

### Redis Setup (for real-time features)

**Windows:**
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Install and run Redis server
3. Or use Docker: `docker run -d -p 6379:6379 redis:alpine`

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

### Environment Variables

Key environment variables you can configure:

- `DEBUG`: Set to `False` for production
- `SECRET_KEY`: Django secret key (generate a new one for production)
- `DATABASE_URL`: Database connection string
- `REDIS_URL`: Redis connection string
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts

## 📚 Features

- **User Management**: Multi-role authentication (Client, Coach, Staff)
- **Plan Management**: Create and manage fitness and nutrition plans
- **Real-time Messaging**: Chat system between coaches and clients
- **Profile Management**: Detailed user profiles with preferences
- **Search Functionality**: Find coaches, plans, and content
- **Social Features**: Friend connections and interactions
- **Dashboard**: Comprehensive overview for all user types

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**Virtual Environment Issues:**
- Make sure you're in the correct directory
- On Windows, you might need to enable script execution: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Database Issues:**
- Delete `db.sqlite3` and run migrations again
- Make sure all migrations are applied: `python manage.py migrate`

**Redis Connection Issues:**
- Ensure Redis server is running
- Check Redis URL in your `.env` file

**Static Files Issues:**
- Run `python manage.py collectstatic`
- Check `STATIC_URL` and `STATIC_ROOT` settings

### Getting Help

- Check the documentation in the `docs/` folder
- Create an issue on GitHub
- Contact the development team
essameldinart@gmail.com
---

**Happy Coding! 🏋️‍♀️💪**