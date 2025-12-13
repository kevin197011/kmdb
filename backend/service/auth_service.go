package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/internal/config"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AuthService interface {
	Login(username, password string) (*LoginResponse, error)
	RefreshToken(refreshToken string) (*LoginResponse, error)
	ValidateToken(tokenString string) (*Claims, error)
	GetUserByID(userID string) (*model.User, error)
}

type LoginResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	User         *model.User `json:"user"`
	ExpiresIn    int       `json:"expires_in"`
}

type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	jwt.RegisteredClaims
}

type authService struct {
	userService UserService
	userRepo    repository.UserRepository
	cfg         *config.Config
}

func NewAuthService(userService UserService, userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{
		userService: userService,
		userRepo:    userRepo,
		cfg:         cfg,
	}
}

func (s *authService) Login(username, password string) (*LoginResponse, error) {
	// 获取用户
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	// 检查用户状态
	if user.Status != "active" {
		return nil, errors.New("用户账户已被禁用")
	}

	// 验证密码
	err = s.userService.VerifyPassword(user.PasswordHash, password)
	if err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	// 生成 token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
		ExpiresIn:    s.cfg.JWT.AccessTokenTTL * 3600, // 转换为秒
	}, nil
}

func (s *authService) RefreshToken(refreshToken string) (*LoginResponse, error) {
	// 解析 refresh token
	token, err := jwt.ParseWithClaims(refreshToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.SecretKey), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("无效的 refresh token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("无效的 token claims")
	}

	// 获取用户
	user, err := s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	// 检查用户状态
	if user.Status != "active" {
		return nil, errors.New("用户账户已被禁用")
	}

	// 生成新的 token
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User:         user,
		ExpiresIn:    s.cfg.JWT.AccessTokenTTL * 3600,
	}, nil
}

func (s *authService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWT.SecretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("无效的 token")
}

func (s *authService) GetUserByID(userID string) (*model.User, error) {
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("无效的用户 ID")
	}
	return s.userRepo.GetByID(id)
}

func (s *authService) generateAccessToken(user *model.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.cfg.JWT.AccessTokenTTL) * time.Hour)
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.SecretKey))
}

func (s *authService) generateRefreshToken(user *model.User) (string, error) {
	expirationTime := time.Now().Add(time.Duration(s.cfg.JWT.RefreshTokenTTL) * 24 * time.Hour)
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWT.SecretKey))
}

