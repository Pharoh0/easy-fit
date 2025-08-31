/* Staff API client using APIBase (JWT) and PaginationUtils */
class StaffAPI {
    static BASE_PATH = '/api/staff';

    static buildListUrl(resource, options = {}) {
        const page = options.page || 1;
        const page_size = options.page_size || 10;
        const params = PaginationUtils.getPaginationQueryParams(
            page,
            page_size,
            {
                search: options.search,
                ordering: options.ordering,
                // spread any filter fields
                ...Object.entries(options)
                    .filter(([k]) => !['page','page_size','search','ordering'].includes(k))
                    .reduce((acc, [k,v]) => { acc[k] = v; return acc; }, {})
            }
        );
        return `${this.BASE_PATH}/${resource}/?${params}`;
    }

    static users = {
        async list(options = {}) {
            const url = StaffAPI.buildListUrl('users', options);
            const resp = await APIBase.request(url);
            if (resp.success) {
                const data = resp.data || {};
                return {
                    success: true,
                    results: data.results || [],
                    count: typeof data.count === 'number' ? data.count : (data.results ? data.results.length : 0),
                    raw: data
                };
            }
            return resp;
        },
        async block(userId) {
            const url = `${StaffAPI.BASE_PATH}/users/${userId}/block/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({}) });
        },
        async unblock(userId) {
            const url = `${StaffAPI.BASE_PATH}/users/${userId}/unblock/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({}) });
        },
        async setUserType(userId, userType) {
            const url = `${StaffAPI.BASE_PATH}/users/${userId}/set_user_type/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({ user_type: userType }) });
        }
    };

    static coaches = {
        async list(options = {}) {
            const url = StaffAPI.buildListUrl('coaches', options);
            const resp = await APIBase.request(url);
            if (resp.success) {
                const data = resp.data || {};
                return {
                    success: true,
                    results: data.results || [],
                    count: typeof data.count === 'number' ? data.count : (data.results ? data.results.length : 0),
                    raw: data
                };
            }
            return resp;
        },
        async approve(coachProfileId, { notes = '', enable_user = false } = {}) {
            const url = `${StaffAPI.BASE_PATH}/coaches/${coachProfileId}/approve/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({ notes, enable_user }) });
        },
        async reject(coachProfileId, { notes = '' } = {}) {
            const url = `${StaffAPI.BASE_PATH}/coaches/${coachProfileId}/reject/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({ notes }) });
        }
    };

    static certifications = {
        async list(options = {}) {
            const url = StaffAPI.buildListUrl('certifications', options);
            const resp = await APIBase.request(url);
            if (resp.success) {
                const data = resp.data || {};
                return {
                    success: true,
                    results: data.results || [],
                    count: typeof data.count === 'number' ? data.count : (data.results ? data.results.length : 0),
                    raw: data
                };
            }
            return resp;
        },
        async approve(certId, { notes = '' } = {}) {
            const url = `${StaffAPI.BASE_PATH}/certifications/${certId}/approve/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({ notes }) });
        },
        async reject(certId, { notes = '' } = {}) {
            const url = `${StaffAPI.BASE_PATH}/certifications/${certId}/reject/`;
            return await APIBase.request(url, { method: 'POST', body: JSON.stringify({ notes }) });
        }
    };

    static dashboard = {
        async metrics() {
            const url = `${StaffAPI.BASE_PATH}/dashboard/metrics/`;
            return await APIBase.request(url);
        }
    };
}

// Global export
window.StaffAPI = StaffAPI;
