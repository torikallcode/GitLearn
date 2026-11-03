package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitlearn/backend/internal/pkg/response"
	"github.com/gitlearn/backend/internal/service"
)

const oauthStateCookie = "gitlearn_oauth_state"

// OAuthHandler implements the GitHub OAuth login flow.
type OAuthHandler struct {
	auth         service.AuthService
	clientID     string
	clientSecret string
	redirectURL  string
	frontendURL  string
	client       *http.Client
}

// NewOAuthHandler builds the GitHub OAuth handler.
func NewOAuthHandler(auth service.AuthService, clientID, clientSecret, redirectURL, frontendURL string) *OAuthHandler {
	return &OAuthHandler{
		auth:         auth,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
		frontendURL:  frontendURL,
		client:       &http.Client{Timeout: 10 * time.Second},
	}
}

func (h *OAuthHandler) configured() bool {
	return h.clientID != "" && h.clientSecret != ""
}

func (h *OAuthHandler) Start(c *gin.Context) {
	if !h.configured() {
		response.Error(c, http.StatusNotImplemented, "GitHub OAuth belum dikonfigurasi", "GITHUB_OAUTH_NOT_CONFIGURED", nil)
		return
	}
	state, err := randomState()
	if err != nil {
		handleError(c, err)
		return
	}
	c.SetCookie(oauthStateCookie, state, 600, "/", "", c.Request.TLS != nil, true)
	params := url.Values{
		"client_id":    {h.clientID},
		"redirect_uri": {h.redirectURL},
		"scope":        {"read:user user:email"},
		"state":        {state},
	}
	c.Redirect(http.StatusFound, "https://github.com/login/oauth/authorize?"+params.Encode())
}

func (h *OAuthHandler) Callback(c *gin.Context) {
	if !h.configured() {
		response.Error(c, http.StatusNotImplemented, "GitHub OAuth belum dikonfigurasi", "GITHUB_OAUTH_NOT_CONFIGURED", nil)
		return
	}
	state, err := c.Cookie(oauthStateCookie)
	if err != nil || state == "" || state != c.Query("state") {
		response.Error(c, http.StatusBadRequest, "State OAuth tidak valid", "INVALID_OAUTH_STATE", nil)
		return
	}
	c.SetCookie(oauthStateCookie, "", -1, "/", "", c.Request.TLS != nil, true)

	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		response.Error(c, http.StatusBadRequest, "Kode OAuth tidak ditemukan", "INVALID_OAUTH_CODE", nil)
		return
	}

	token, err := h.exchangeCode(c, code)
	if err != nil {
		handleError(c, err)
		return
	}
	email, name, err := h.githubProfile(c, token)
	if err != nil {
		handleError(c, err)
		return
	}
	session, err := h.auth.OAuthLogin(c.Request.Context(), email, name)
	if err != nil {
		handleError(c, err)
		return
	}

	fragment := url.Values{
		"access_token":  {session.AccessToken},
		"refresh_token": {session.RefreshToken},
	}.Encode()
	c.Redirect(http.StatusFound, h.frontendURL+"/oauth/callback#"+fragment)
}

func (h *OAuthHandler) exchangeCode(c *gin.Context, code string) (string, error) {
	form := url.Values{
		"client_id":     {h.clientID},
		"client_secret": {h.clientSecret},
		"code":          {code},
		"redirect_uri":  {h.redirectURL},
	}
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost,
		"https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github token exchange: status %d", res.StatusCode)
	}
	var payload struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", fmt.Errorf("github token exchange: %s", payload.Error)
	}
	return payload.AccessToken, nil
}

func (h *OAuthHandler) githubProfile(c *gin.Context, token string) (string, string, error) {
	var profile struct {
		Login string `json:"login"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := h.githubGet(c, "https://api.github.com/user", token, &profile); err != nil {
		return "", "", err
	}
	name := profile.Name
	if name == "" {
		name = profile.Login
	}
	if profile.Email != "" {
		return profile.Email, name, nil
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	if err := h.githubGet(c, "https://api.github.com/user/emails", token, &emails); err != nil {
		return "", "", err
	}
	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, name, nil
		}
	}
	for _, e := range emails {
		if e.Verified {
			return e.Email, name, nil
		}
	}
	return "", "", errors.New("github account has no verified email")
}

func (h *OAuthHandler) githubGet(c *gin.Context, endpoint, token string, dst any) error {
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "GitLearn")

	res, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("github api %s: status %d", endpoint, res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(dst)
}

func randomState() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
