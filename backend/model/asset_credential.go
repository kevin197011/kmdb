package model

import (
	"time"

	"github.com/google/uuid"
)

// AssetCredential 资产凭证表
// 用于存储资产的 SSH 账号和密钥信息
type AssetCredential struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AssetID     *uuid.UUID `gorm:"type:uuid;index;uniqueIndex:idx_credential_name_asset" json:"asset_id,omitempty"`
	Name        string     `gorm:"type:varchar(255);not null;uniqueIndex:idx_credential_name_asset" json:"name"` // 凭证名称（如：root账号、admin账号）
	Username    string     `gorm:"type:varchar(255);not null" json:"username"`                                   // SSH 用户名
	AuthType    string     `gorm:"type:varchar(50);not null;default:'password'" json:"auth_type"`                // password 或 key
	Password    *string    `gorm:"type:text" json:"password,omitempty"`                                          // 密码（加密存储）
	PrivateKey  *string    `gorm:"type:text" json:"private_key,omitempty"`                                       // 私钥（加密存储）
	PublicKey   *string    `gorm:"type:text" json:"public_key,omitempty"`                                        // 公钥
	Passphrase  *string    `gorm:"type:text" json:"passphrase,omitempty"`                                        // 密钥密码（加密存储）
	Description string     `gorm:"type:text" json:"description"`                                                 // 描述
	IsDefault   bool       `gorm:"default:false" json:"is_default"`                                              // 是否为默认凭证
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 关联关系
	Asset *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
}

func (AssetCredential) TableName() string {
	return "asset_credentials"
}
