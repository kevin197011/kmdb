package model

import (
	"time"

	"github.com/google/uuid"
)

type Asset struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Type      string     `gorm:"type:varchar(50);not null;index" json:"type"`
	Name      string     `gorm:"type:varchar(255);not null;unique" json:"name"`
	Status    string     `gorm:"type:varchar(50);not null;index" json:"status"`
	ProjectID *uuid.UUID `gorm:"type:uuid;index" json:"project_id"`
	SSHPort   int        `gorm:"type:int;default:22" json:"ssh_port"` // SSH 端口，默认 22

	// 资产详细信息字段（从 metadata JSON 拆分）
	IP            string `gorm:"type:varchar(50);index" json:"ip"`              // IP 地址
	OS            string `gorm:"type:varchar(100)" json:"os"`                   // 操作系统
	CPU           string `gorm:"type:varchar(100)" json:"cpu"`                  // CPU 信息
	Memory        string `gorm:"type:varchar(50)" json:"memory"`                // 内存信息
	Disk          string `gorm:"type:varchar(100)" json:"disk"`                 // 磁盘信息
	Location      string `gorm:"type:varchar(255)" json:"location"`             // 位置信息
	Department    string `gorm:"type:varchar(100);index" json:"department"`     // 所属部门
	CloudPlatform string `gorm:"type:varchar(50);index" json:"cloud_platform"`  // 云平台（阿里云/腾讯云/华为云/AWS/Azure/自建等）
	Remark        string `gorm:"type:text" json:"remark"`                       // 备注

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联关系
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

func (Asset) TableName() string {
	return "assets"
}
