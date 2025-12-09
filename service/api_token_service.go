package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type APITokenService interface {
	CreateToken(userID uuid.UUID, name string, scopes []model.TokenScope, expiresIn *int) (*model.APIToken, string, error)
	GetToken(id uuid.UUID) (*model.APIToken, error)
	GetUserTokens(userID uuid.UUID) ([]model.APIToken, error)
	ListTokens(page, limit int) ([]model.APIToken, int64, error)
	RevokeToken(id uuid.UUID) error
	DeleteToken(id uuid.UUID) error
	ValidateToken(rawToken string) (*model.APIToken, error)
	UpdateLastUsed(id uuid.UUID) error
}

type apiTokenService struct {
	repo repository.APITokenRepository
}

func NewAPITokenService(repo repository.APITokenRepository) APITokenService {
	return &apiTokenService{repo: repo}
}

// generateSecureToken 生成安全的随机 Token
func generateSecureToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashToken 对 Token 进行 SHA256 哈希
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// CreateToken 创建新的 API Token
// expiresIn: 过期天数，nil 表示永不过期
func (s *apiTokenService) CreateToken(userID uuid.UUID, name string, scopes []model.TokenScope, expiresIn *int) (*model.APIToken, string, error) {
	// 生成随机 Token
	rawToken, err := generateSecureToken()
	if err != nil {
		return nil, "", fmt.Errorf("生成 Token 失败: %w", err)
	}

	// Token 格式: kmdb_xxxxxxxxxxxx...
	fullToken := fmt.Sprintf("kmdb_%s", rawToken)
	tokenPrefix := fullToken[:12] // 前12位用于识别

	// 哈希存储
	tokenHash := hashToken(fullToken)

	// 序列化 scopes
	var scopesJSON string
	if scopes != nil {
		scopesBytes, err := json.Marshal(scopes)
		if err != nil {
			return nil, "", fmt.Errorf("序列化权限范围失败: %w", err)
		}
		scopesJSON = string(scopesBytes)
	}

	// 计算过期时间
	var expiresAt *time.Time
	if expiresIn != nil && *expiresIn > 0 {
		exp := time.Now().AddDate(0, 0, *expiresIn)
		expiresAt = &exp
	}

	token := &model.APIToken{
		Name:        name,
		Token:       tokenHash,
		TokenPrefix: tokenPrefix,
		UserID:      userID,
		Scopes:      scopesJSON,
		ExpiresAt:   expiresAt,
		Status:      "active",
	}

	if err := s.repo.Create(token); err != nil {
		return nil, "", fmt.Errorf("创建 Token 失败: %w", err)
	}

	// 返回创建的 Token 和原始 Token 值（仅此一次显示）
	return token, fullToken, nil
}

func (s *apiTokenService) GetToken(id uuid.UUID) (*model.APIToken, error) {
	return s.repo.GetByID(id)
}

func (s *apiTokenService) GetUserTokens(userID uuid.UUID) ([]model.APIToken, error) {
	return s.repo.GetByUserID(userID)
}

func (s *apiTokenService) ListTokens(page, limit int) ([]model.APIToken, int64, error) {
	return s.repo.List(page, limit)
}

func (s *apiTokenService) RevokeToken(id uuid.UUID) error {
	token, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	token.Status = "revoked"
	return s.repo.Update(token)
}

func (s *apiTokenService) DeleteToken(id uuid.UUID) error {
	return s.repo.Delete(id)
}

// ValidateToken 验证 Token 并返回关联的 Token 信息
func (s *apiTokenService) ValidateToken(rawToken string) (*model.APIToken, error) {
	// 检查 Token 格式
	if len(rawToken) < 12 || rawToken[:5] != "kmdb_" {
		return nil, errors.New("无效的 Token 格式")
	}

	// 计算哈希
	tokenHash := hashToken(rawToken)

	// 查找 Token
	token, err := s.repo.GetByToken(tokenHash)
	if err != nil {
		return nil, errors.New("Token 不存在或已被撤销")
	}

	// 检查状态
	if token.Status != "active" {
		return nil, errors.New("Token 已被撤销")
	}

	// 检查过期时间
	if token.ExpiresAt != nil && token.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("Token 已过期")
	}

	return token, nil
}

func (s *apiTokenService) UpdateLastUsed(id uuid.UUID) error {
	return s.repo.UpdateLastUsed(id)
}

// GetScopes 解析 Token 的权限范围
func GetScopes(token *model.APIToken) ([]model.TokenScope, error) {
	if token.Scopes == "" {
		return nil, nil
	}

	var scopes []model.TokenScope
	if err := json.Unmarshal([]byte(token.Scopes), &scopes); err != nil {
		return nil, err
	}
	return scopes, nil
}

// HasScope 检查 Token 是否有指定的权限
func HasScope(token *model.APIToken, resource, action string) bool {
	scopes, err := GetScopes(token)
	if err != nil {
		return false
	}

	// 如果没有定义 scopes，默认允许所有操作
	if scopes == nil || len(scopes) == 0 {
		return true
	}

	for _, scope := range scopes {
		if scope.Resource == resource || scope.Resource == "*" {
			for _, a := range scope.Actions {
				if a == action || a == "*" {
					return true
				}
			}
		}
	}
	return false
}

