// ═══════════════════════════════════════════════════
// Frontend API Client
// Handles authenticated requests to the Bio-Hacked API
// ═══════════════════════════════════════════════════

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

class ApiClient {
  async request(path, options = {}) {
    const url = `${BASE_URL}/api${path}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Send cookies
      ...options,
    };

    if (config.body && typeof config.body === "object") {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || "Request failed", response.status, data);
    }

    return data;
  }

  // ── Auth ──
  async register(email, password, name, role) {
    return this.request("/auth", {
      method: "POST",
      body: { action: "register", email, password, name, role },
    });
  }

  async login(email, password) {
    return this.request("/auth", {
      method: "POST",
      body: { action: "login", email, password },
    });
  }

  async logout() {
    return this.request("/auth", {
      method: "POST",
      body: { action: "logout" },
    });
  }

  async getProfile() {
    return this.request("/auth");
  }

  async updateProfile(data) {
    return this.request("/auth", { method: "PATCH", body: data });
  }

  // ── Recipes ──
  async generateRecipe(query, calories, protein, carbs, fat) {
    return this.request("/recipes", {
      method: "POST",
      body: { query, calories, protein, carbs, fat },
    });
  }

  async saveRecipe(recipeId) {
    return this.request("/recipes", {
      method: "POST",
      body: { action: "save", recipeId },
    });
  }

  async getSavedRecipes(page = 1) {
    return this.request(`/recipes?page=${page}`);
  }

  async unsaveRecipe(recipeId) {
    return this.request(`/recipes?id=${recipeId}`, { method: "DELETE" });
  }

  // ── Meal Plans ──
  async generateMealPlan(data) {
    return this.request("/meal-plans", { method: "POST", body: data });
  }

  async getMealPlans(clientId = null) {
    const params = clientId ? `?clientId=${clientId}` : "";
    return this.request(`/meal-plans${params}`);
  }

  // ── Check-ins ──
  async submitCheckin(data) {
    return this.request("/checkins", { method: "POST", body: data });
  }

  async getCheckins(clientId = null, status = null) {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (status) params.set("status", status);
    return this.request(`/checkins?${params}`);
  }

  async submitFeedback(checkinId, feedback, videoUrl = null) {
    return this.request("/checkins", {
      method: "POST",
      body: { action: "feedback", checkinId, feedback, videoUrl },
    });
  }

  // ── Clients (Coach) ──
  async getClients() {
    return this.request("/clients");
  }

  async addClient(email) {
    return this.request("/clients", { method: "POST", body: { email } });
  }

  async removeClient(clientId) {
    return this.request(`/clients?id=${clientId}`, { method: "DELETE" });
  }

  // ── Training ──
  async logTraining(data) {
    return this.request("/training", { method: "POST", body: data });
  }

  async getTrainingLogs(clientId = null) {
    const params = clientId ? `?clientId=${clientId}` : "";
    return this.request(`/training${params}`);
  }

  // ── Forum ──
  async createPost(title, body, tags = []) {
    return this.request("/forum", { method: "POST", body: { title, body, tags } });
  }

  async getPosts(tag = null, page = 1) {
    const params = new URLSearchParams({ page: String(page) });
    if (tag && tag !== "all") params.set("tag", tag);
    return this.request(`/forum?${params}`);
  }

  async getPost(id) {
    return this.request(`/forum?id=${id}`);
  }

  async replyToPost(postId, body) {
    return this.request("/forum", {
      method: "POST",
      body: { action: "reply", postId, body },
    });
  }

  async likePost(postId) {
    return this.request("/forum", {
      method: "POST",
      body: { action: "like", postId },
    });
  }

  // ── Education ──
  async getVideos(category = null) {
    const params = category && category !== "all" ? `?category=${category}` : "";
    return this.request(`/education${params}`);
  }

  async getPapers(category = null) {
    const params = category ? `?category=${category}&type=papers` : "?type=papers";
    return this.request(`/education${params}`);
  }

  async summarizePaper(paperId) {
    return this.request("/education", {
      method: "POST",
      body: { action: "summarize", paperId },
    });
  }

  // ── Payments ──
  async initiatePayment(plan) {
    return this.request("/payments", { method: "POST", body: { plan } });
  }

  async getSubscriptionStatus() {
    return this.request("/payments");
  }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();
export { ApiError };
