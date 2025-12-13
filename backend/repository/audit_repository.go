package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type AuditRepository interface {
	Create(log *model.AuditLog) error
	Query(filters map[string]interface{}, offset, limit int) ([]*model.AuditLog, int64, error)
	GetRecentLogs(limit int) ([]*model.AuditLog, error)
}

type auditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) Create(log *model.AuditLog) error {
	return r.db.Create(log).Error
}

func (r *auditRepository) Query(filters map[string]interface{}, offset, limit int) ([]*model.AuditLog, int64, error) {
	var logs []*model.AuditLog
	var total int64

	query := r.db.Model(&model.AuditLog{})

	// 应用过滤器
	if module, ok := filters["module"].(string); ok && module != "" {
		query = query.Where("module = ?", module)
	}
	if action, ok := filters["action"].(string); ok && action != "" {
		query = query.Where("action = ?", action)
	}
	if resourceID, ok := filters["resource_id"].(uuid.UUID); ok {
		query = query.Where("resource_id = ?", resourceID)
	}
	if userID, ok := filters["user_id"].(uuid.UUID); ok {
		query = query.Where("user_id = ?", userID)
	}
	if startTime, ok := filters["start_time"].(time.Time); ok {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime, ok := filters["end_time"].(time.Time); ok {
		query = query.Where("created_at <= ?", endTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&logs).Error

	return logs, total, err
}

func (r *auditRepository) GetRecentLogs(limit int) ([]*model.AuditLog, error) {
	var logs []*model.AuditLog
	err := r.db.Order("created_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}
