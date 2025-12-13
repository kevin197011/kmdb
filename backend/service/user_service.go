package service

import (
	"errors"
	"fmt"
	"regexp"
	"unicode"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	CreateUser(user *model.User, password string) error
	GetUser(id uuid.UUID) (*model.User, error)
	GetUserByUsername(username string) (*model.User, error)
	ListUsers(offset, limit int, filters map[string]interface{}) ([]*model.User, int64, error)
	UpdateUser(id uuid.UUID, user *model.User) error
	DeleteUser(id uuid.UUID) error
	ChangePassword(userID uuid.UUID, oldPassword, newPassword string, verifyOldPassword bool) error
	ValidatePassword(password string) error
	HashPassword(password string) (string, error)
	VerifyPassword(hashedPassword, password string) error
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{
		userRepo: userRepo,
	}
}

func (s *userService) ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("密码长度至少为8位")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("密码必须包含大小写字母和数字")
	}

	return nil
}

func (s *userService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func (s *userService) VerifyPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func (s *userService) CreateUser(user *model.User, password string) error {
	// 验证必填字段
	if user.Username == "" {
		return errors.New("用户名不能为空")
	}
	if user.Email == "" {
		return errors.New("邮箱不能为空")
	}
	if password == "" {
		return errors.New("密码不能为空")
	}

	// 验证邮箱格式
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(user.Email) {
		return errors.New("邮箱格式无效")
	}

	// 验证密码强度
	if err := s.ValidatePassword(password); err != nil {
		return err
	}

	// 检查用户名是否已存在
	_, err := s.userRepo.GetByUsername(user.Username)
	if err == nil {
		return errors.New("用户名已存在")
	}

	// 检查邮箱是否已存在
	_, err = s.userRepo.GetByEmail(user.Email)
	if err == nil {
		return errors.New("邮箱已存在")
	}

	// 哈希密码
	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	user.PasswordHash = hashedPassword
	if user.Status == "" {
		user.Status = "active"
	}

	return s.userRepo.Create(user)
}

func (s *userService) GetUser(id uuid.UUID) (*model.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *userService) GetUserByUsername(username string) (*model.User, error) {
	return s.userRepo.GetByUsername(username)
}

func (s *userService) ListUsers(offset, limit int, filters map[string]interface{}) ([]*model.User, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.userRepo.List(offset, limit, filters)
}

func (s *userService) UpdateUser(id uuid.UUID, user *model.User) error {
	existing, err := s.userRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}

	// 更新字段
	if user.Username != "" {
		// 检查新用户名是否已被其他用户使用
		existingUser, _ := s.userRepo.GetByUsername(user.Username)
		if existingUser != nil && existingUser.ID != id {
			return errors.New("用户名已被使用")
		}
		existing.Username = user.Username
	}
	if user.Email != "" {
		// 验证邮箱格式
		emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
		if !emailRegex.MatchString(user.Email) {
			return errors.New("邮箱格式无效")
		}
		// 检查新邮箱是否已被其他用户使用
		existingUser, _ := s.userRepo.GetByEmail(user.Email)
		if existingUser != nil && existingUser.ID != id {
			return errors.New("邮箱已被使用")
		}
		existing.Email = user.Email
	}
	if user.Status != "" {
		existing.Status = user.Status
	}

	return s.userRepo.Update(existing)
}

func (s *userService) DeleteUser(id uuid.UUID) error {
	_, err := s.userRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}

	return s.userRepo.Delete(id)
}

func (s *userService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string, verifyOldPassword bool) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}

	// 如果需要验证旧密码（用户修改自己的密码）
	if verifyOldPassword {
		if oldPassword == "" {
			return errors.New("旧密码不能为空")
		}
		// 验证旧密码
		if err := s.VerifyPassword(user.PasswordHash, oldPassword); err != nil {
			return errors.New("当前密码不正确")
		}
	}

	// 验证新密码
	if err := s.ValidatePassword(newPassword); err != nil {
		return err
	}

	// 哈希新密码
	hashedPassword, err := s.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("密码加密失败: %w", err)
	}

	// 更新密码
	user.PasswordHash = hashedPassword
	return s.userRepo.Update(user)
}
