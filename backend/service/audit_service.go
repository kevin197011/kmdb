package service

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AuditService interface {
	Log(module, action string, resourceID, userID uuid.UUID, details interface{}) error
	Query(filters map[string]interface{}, offset, limit int) ([]*model.AuditLog, int64, error)
}

type auditService struct {
	auditRepo repository.AuditRepository
}

func NewAuditService(auditRepo repository.AuditRepository) AuditService {
	return &auditService{
		auditRepo: auditRepo,
	}
}

func (s *auditService) Log(module, action string, resourceID, userID uuid.UUID, details interface{}) error {
	var detailsJSON string
	if details != nil {
		jsonBytes, err := json.Marshal(details)
		if err != nil {
			detailsJSON = "{}"
		} else {
			detailsJSON = string(jsonBytes)
		}
	}

	log := &model.AuditLog{
		Module:     module,
		Action:     action,
		ResourceID: resourceID,
		UserID:     userID,
		Details:    detailsJSON,
		CreatedAt:  time.Now(),
	}

	return s.auditRepo.Create(log)
}

func (s *auditService) Query(filters map[string]interface{}, offset, limit int) ([]*model.AuditLog, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.auditRepo.Query(filters, offset, limit)
}

// AuditHook 审计钩子接口，供其他服务使用
type AuditHook interface {
	LogCreate(module string, resourceID, userID uuid.UUID, data interface{}) error
	LogUpdate(module string, resourceID, userID uuid.UUID, oldData, newData interface{}) error
	LogDelete(module string, resourceID, userID uuid.UUID, data interface{}) error
}

type auditHook struct {
	auditService AuditService
}

func NewAuditHook(auditService AuditService) AuditHook {
	return &auditHook{auditService: auditService}
}

func (h *auditHook) LogCreate(module string, resourceID, userID uuid.UUID, data interface{}) error {
	return h.auditService.Log(module, "create", resourceID, userID, data)
}

func (h *auditHook) LogUpdate(module string, resourceID, userID uuid.UUID, oldData, newData interface{}) error {
	details := map[string]interface{}{
		"old": oldData,
		"new": newData,
	}
	return h.auditService.Log(module, "update", resourceID, userID, details)
}

func (h *auditHook) LogDelete(module string, resourceID, userID uuid.UUID, data interface{}) error {
	return h.auditService.Log(module, "delete", resourceID, userID, data)
}

