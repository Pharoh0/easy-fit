/* Notifications API using APIBase (JWT + CSRF aware) */
class NotificationsAPI {
    static get BASE() { return '/plan-management/api/v1'; }

    // List notifications with optional filters: { unread_only: 'true'|'false', type, subscription, start_date }
    static async list(params = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params || {})) {
            if (v != null && v !== '') qs.append(k, String(v));
        }
        const url = `${this.BASE}/notifications/${qs.toString() ? ('?' + qs.toString()) : ''}`;
        return APIBase.request(url, { method: 'GET' });
    }

    static async unreadCount(params = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params || {})) {
            if (v != null && v !== '') qs.append(k, String(v));
        }
        const url = `${this.BASE}/notifications/unread_count/${qs.toString() ? ('?' + qs.toString()) : ''}`;
        return APIBase.request(url, { method: 'GET', noRedirectOn401: true });
    }

    static async markAllRead(params = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params || {})) {
            if (v != null && v !== '') qs.append(k, String(v));
        }
        const url = `${this.BASE}/notifications/mark_all_read/${qs.toString() ? ('?' + qs.toString()) : ''}`;
        return APIBase.request(url, { method: 'POST' });
    }

    static async markRead(id) {
        const url = `${this.BASE}/notifications/${id}/mark_read/`;
        return APIBase.request(url, { method: 'POST' });
    }

    static async summary() {
        const url = `${this.BASE}/notifications/summary/`;
        return APIBase.request(url, { method: 'GET' });
    }

    // Preferences
    static async myPreferences() {
        const url = `${this.BASE}/notification-preferences/my_preferences/`;
        return APIBase.request(url, { method: 'GET' });
    }

    static async updatePreferences(patch) {
        const url = `${this.BASE}/notification-preferences/update_preferences/`;
        return APIBase.request(url, { method: 'PUT', body: JSON.stringify(patch) });
    }
}

window.NotificationsAPI = NotificationsAPI;
