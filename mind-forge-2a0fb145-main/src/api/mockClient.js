// Mock client to replace Base44 SDK
// Uses localStorage for data persistence

const STORAGE_KEYS = {
  USER: 'mindforge_user',
  ENTITIES: 'mindforge_entities_'
};

// Helper to generate unique IDs
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Mock Auth API
const mockAuth = {
  me: async () => {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) {
      // Auto-create a default user if none exists
      const defaultUser = {
        id: generateId(),
        username: 'user',
        email: 'user@example.com',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        // Default fields
        relationship_status: '',
        parenthood: [],
        employment: '',
        life_stage: '',
        living_situation: '',
        primary_goals: [],
        mental_health_experience: '',
        current_streak: 0,
        longest_streak: 0,
        total_entries: 0,
        achievements: [],
        last_journal_date: null,
        privacy_settings: {
          show_username_in_community: false,
          allow_ai_analysis: true,
          email_notifications: true,
          daily_reminder: false,
          reminder_time: '09:00'
        }
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(userStr);
  },

  updateMe: async (updates) => {
    const user = await mockAuth.me();
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return updatedUser;
  },

  logout: (redirectUrl) => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin: (returnUrl) => {
    // For mock, just reload to reset state
    console.log('Mock: Would redirect to login with return URL:', returnUrl);
    window.location.reload();
  }
};

// Mock Entity Query API
class MockQuery {
  constructor(entityName) {
    this.entityName = entityName;
    this.storageKey = STORAGE_KEYS.ENTITIES + entityName;
    this.filters = [];
    this.sortConfig = null;
    this.limitValue = null;
  }

  async getAll() {
    const dataStr = localStorage.getItem(this.storageKey);
    let data = dataStr ? JSON.parse(dataStr) : [];

    // Apply filters
    if (this.filters.length > 0) {
      data = data.filter(item => {
        return this.filters.every(filter => {
          const value = item[filter.field];
          switch (filter.operator) {
            case '==':
              return value === filter.value;
            case '!=':
              return value !== filter.value;
            case '>':
              return value > filter.value;
            case '<':
              return value < filter.value;
            case '>=':
              return value >= filter.value;
            case '<=':
              return value <= filter.value;
            case 'in':
              return filter.value.includes(value);
            case 'contains':
              return Array.isArray(value) && value.includes(filter.value);
            default:
              return true;
          }
        });
      });
    }

    // Apply sorting
    if (this.sortConfig) {
      data.sort((a, b) => {
        const aVal = a[this.sortConfig.field];
        const bVal = b[this.sortConfig.field];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return this.sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    if (this.limitValue) {
      data = data.slice(0, this.limitValue);
    }

    return data;
  }

  async getOne() {
    const all = await this.getAll();
    return all.length > 0 ? all[0] : null;
  }

  where(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.sortConfig = { field, direction };
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  async create(data) {
    const newItem = {
      id: generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const allData = await this._getAllRaw();
    allData.push(newItem);
    localStorage.setItem(this.storageKey, JSON.stringify(allData));
    return newItem;
  }

  async update(id, updates) {
    const allData = await this._getAllRaw();
    const index = allData.findIndex(item => item.id === id);
    if (index !== -1) {
      allData[index] = {
        ...allData[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(allData));
      return allData[index];
    }
    throw new Error('Entity not found');
  }

  async delete(id) {
    const allData = await this._getAllRaw();
    const filtered = allData.filter(item => item.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    return { success: true };
  }

  async _getAllRaw() {
    const dataStr = localStorage.getItem(this.storageKey);
    return dataStr ? JSON.parse(dataStr) : [];
  }
}

// Mock Integrations
const mockIntegrations = {
  Core: {
    InvokeLLM: async ({ prompt, model = 'gpt-3.5-turbo' }) => {
      console.log('Mock LLM called with prompt:', prompt);
      // Return a mock response
      return {
        response: `This is a mock AI response to: "${prompt.substring(0, 50)}..."\n\nIn a production environment, this would call a real LLM API.`,
        model,
        timestamp: new Date().toISOString()
      };
    },

    SendEmail: async ({ to, subject, body }) => {
      console.log('Mock Email:', { to, subject, body });
      return { success: true, message: 'Email would be sent in production' };
    },

    SendSMS: async ({ to, message }) => {
      console.log('Mock SMS:', { to, message });
      return { success: true, message: 'SMS would be sent in production' };
    },

    UploadFile: async (file) => {
      console.log('Mock File Upload:', file?.name);
      return {
        url: URL.createObjectURL(file),
        filename: file.name,
        size: file.size,
        type: file.type
      };
    },

    GenerateImage: async ({ prompt }) => {
      console.log('Mock Image Generation:', prompt);
      return {
        url: `https://via.placeholder.com/512x512?text=${encodeURIComponent(prompt.substring(0, 20))}`,
        prompt
      };
    },

    ExtractDataFromUploadedFile: async (fileUrl) => {
      console.log('Mock Data Extraction from:', fileUrl);
      return {
        text: 'Mock extracted text content',
        metadata: {}
      };
    }
  }
};

// Mock app logs
const mockAppLogs = {
  logUserInApp: async (pageName) => {
    console.log('Mock App Log - User visited page:', pageName);
    return { success: true };
  }
};

// Create the mock client that mimics Base44 SDK structure
export const mockClient = {
  auth: mockAuth,
  entities: {
    Query: (entityName) => new MockQuery(entityName)
  },
  integrations: mockIntegrations,
  appLogs: mockAppLogs
};
