package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AssetCredentialService interface {
	CreateCredential(credential *model.AssetCredential) error
	GetCredential(id uuid.UUID) (*model.AssetCredential, error)
	GetCredentialsByAssetID(assetID uuid.UUID) ([]*model.AssetCredential, error)
	GetAllCredentials() ([]*model.AssetCredential, error)
	UpdateCredential(id uuid.UUID, credential *model.AssetCredential) error
	DeleteCredential(id uuid.UUID) error
	SetDefaultCredential(assetID uuid.UUID, credentialID uuid.UUID) error
	GetDefaultCredential(assetID uuid.UUID) (*model.AssetCredential, error)
	DecryptPassword(encrypted string) (string, error)
	EncryptPassword(password string) (string, error)
	GetCredentialForConnection(credentialID uuid.UUID) (*model.AssetCredential, error)
}

type assetCredentialService struct {
	credentialRepo repository.AssetCredentialRepository
	assetRepo      repository.AssetRepository
	encryptionKey  []byte // 用于加密敏感信息的密钥
}

func NewAssetCredentialService(
	credentialRepo repository.AssetCredentialRepository,
	assetRepo repository.AssetRepository,
) AssetCredentialService {
	// 使用固定的密钥（生产环境应该从配置读取）
	// AES-256 requires exactly 32 bytes
	key := make([]byte, 32)
	copy(key, []byte("kmdb-encryption-key-32bytes!!"))
	if len(key) < 32 {
		for i := len(key); i < 32; i++ {
			key[i] = '!'
		}
	}
	key = key[:32] // Ensure exactly 32 bytes
	return &assetCredentialService{
		credentialRepo: credentialRepo,
		assetRepo:      assetRepo,
		encryptionKey:  key,
	}
}

func (s *assetCredentialService) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *assetCredentialService) decrypt(ciphertext string) (string, error) {
	// 首先尝试 base64 解码
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		// 如果 base64 解码失败，可能是未加密的原始数据
		// 检查是否包含私钥标记（未加密的私钥通常包含 BEGIN/END 标记）
		upperText := strings.ToUpper(ciphertext)
		if strings.Contains(upperText, "BEGIN") && strings.Contains(upperText, "END") {
			// 看起来是未加密的私钥，直接返回
			return ciphertext, nil
		}
		// 否则返回错误
		return "", fmt.Errorf("无效的加密数据格式: %w", err)
	}

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func (s *assetCredentialService) EncryptPassword(password string) (string, error) {
	return s.encrypt(password)
}

func (s *assetCredentialService) DecryptPassword(encrypted string) (string, error) {
	return s.decrypt(encrypted)
}

func (s *assetCredentialService) CreateCredential(credential *model.AssetCredential) error {
	// 如果指定了资产ID，验证资产存在
	if credential.AssetID != nil {
		_, err := s.assetRepo.GetByID(*credential.AssetID)
		if err != nil {
			return errors.New("资产不存在")
		}
	}

	// 验证必填字段
	if credential.Name == "" {
		return errors.New("凭证名称不能为空")
	}
	if credential.Username == "" {
		return errors.New("用户名不能为空")
	}

	// 根据认证类型验证
	if credential.AuthType == "password" {
		if credential.Password == nil || *credential.Password == "" {
			return errors.New("密码不能为空")
		}
		// 加密密码
		encrypted, err := s.EncryptPassword(*credential.Password)
		if err != nil {
			return fmt.Errorf("密码加密失败: %w", err)
		}
		credential.Password = &encrypted
	} else if credential.AuthType == "key" {
		if credential.PrivateKey == nil || *credential.PrivateKey == "" {
			return errors.New("私钥不能为空")
		}
		// 加密私钥
		encrypted, err := s.EncryptPassword(*credential.PrivateKey)
		if err != nil {
			return fmt.Errorf("私钥加密失败: %w", err)
		}
		credential.PrivateKey = &encrypted

		// 如果有密钥密码，也加密
		if credential.Passphrase != nil && *credential.Passphrase != "" {
			encrypted, err := s.EncryptPassword(*credential.Passphrase)
			if err != nil {
				return fmt.Errorf("密钥密码加密失败: %w", err)
			}
			credential.Passphrase = &encrypted
		}
	} else {
		return errors.New("认证类型必须是 password 或 key")
	}

	// 如果设置为默认凭证且有关联资产，先取消其他默认凭证
	if credential.IsDefault && credential.AssetID != nil {
		existing, _ := s.credentialRepo.GetDefaultByAssetID(*credential.AssetID)
		if existing != nil {
			existing.IsDefault = false
			_ = s.credentialRepo.Update(existing)
		}
	}

	return s.credentialRepo.Create(credential)
}

func (s *assetCredentialService) GetCredential(id uuid.UUID) (*model.AssetCredential, error) {
	return s.credentialRepo.GetByID(id)
}

func (s *assetCredentialService) GetCredentialsByAssetID(assetID uuid.UUID) ([]*model.AssetCredential, error) {
	return s.credentialRepo.GetByAssetID(assetID)
}

func (s *assetCredentialService) GetAllCredentials() ([]*model.AssetCredential, error) {
	return s.credentialRepo.GetAll()
}

func (s *assetCredentialService) GetCredentialForConnection(credentialID uuid.UUID) (*model.AssetCredential, error) {
	credential, err := s.credentialRepo.GetByID(credentialID)
	if err != nil {
		return nil, err
	}
	// 解密密码或私钥（如果需要）
	// 注意：这里返回的凭证包含敏感信息，仅用于连接
	return credential, nil
}

func (s *assetCredentialService) UpdateCredential(id uuid.UUID, credential *model.AssetCredential) error {
	existing, err := s.credentialRepo.GetByID(id)
	if err != nil {
		return errors.New("凭证不存在")
	}

	// 更新字段
	if credential.Name != "" {
		existing.Name = credential.Name
	}
	if credential.Username != "" {
		existing.Username = credential.Username
	}
	if credential.AuthType != "" {
		existing.AuthType = credential.AuthType
	}
	if credential.Description != "" {
		existing.Description = credential.Description
	}

	// 更新密码（如果提供）
	if credential.Password != nil && *credential.Password != "" {
		// 如果密码不是加密格式（以 base64 开头），则加密
		if len(*credential.Password) < 50 { // 加密后的密码通常较长
			encrypted, err := s.EncryptPassword(*credential.Password)
			if err != nil {
				return fmt.Errorf("密码加密失败: %w", err)
			}
			existing.Password = &encrypted
		} else {
			existing.Password = credential.Password
		}
	}

	// 更新私钥（如果提供）
	if credential.PrivateKey != nil && *credential.PrivateKey != "" {
		// 如果私钥不是加密格式，则加密
		if len(*credential.PrivateKey) < 100 { // 加密后的私钥通常较长
			encrypted, err := s.EncryptPassword(*credential.PrivateKey)
			if err != nil {
				return fmt.Errorf("私钥加密失败: %w", err)
			}
			existing.PrivateKey = &encrypted
		} else {
			existing.PrivateKey = credential.PrivateKey
		}
	}

	// 更新公钥
	if credential.PublicKey != nil {
		existing.PublicKey = credential.PublicKey
	}

	// 更新密钥密码
	if credential.Passphrase != nil {
		if *credential.Passphrase != "" {
			encrypted, err := s.EncryptPassword(*credential.Passphrase)
			if err != nil {
				return fmt.Errorf("密钥密码加密失败: %w", err)
			}
			existing.Passphrase = &encrypted
		} else {
			existing.Passphrase = nil
		}
	}

	// 处理默认凭证设置
	if credential.IsDefault && !existing.IsDefault {
		// 如果有关联资产，先取消其他默认凭证
		if existing.AssetID != nil {
			defaultCred, _ := s.credentialRepo.GetDefaultByAssetID(*existing.AssetID)
			if defaultCred != nil && defaultCred.ID != id {
				defaultCred.IsDefault = false
				_ = s.credentialRepo.Update(defaultCred)
			}
		}
		existing.IsDefault = true
	}

	return s.credentialRepo.Update(existing)
}

func (s *assetCredentialService) DeleteCredential(id uuid.UUID) error {
	return s.credentialRepo.Delete(id)
}

func (s *assetCredentialService) SetDefaultCredential(assetID uuid.UUID, credentialID uuid.UUID) error {
	return s.credentialRepo.SetDefault(assetID, credentialID)
}

func (s *assetCredentialService) GetDefaultCredential(assetID uuid.UUID) (*model.AssetCredential, error) {
	return s.credentialRepo.GetDefaultByAssetID(assetID)
}
