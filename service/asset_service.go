package service

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type AssetService interface {
	CreateAsset(asset *model.Asset, userID uuid.UUID) error
	GetAsset(id uuid.UUID) (*model.Asset, error)
	ListAssets(offset, limit int, filters map[string]interface{}) ([]*model.Asset, int64, error)
	UpdateAsset(id uuid.UUID, asset *model.Asset, userID uuid.UUID) error
	DeleteAsset(id uuid.UUID, userID uuid.UUID) error
	GetAssetsByProjectID(projectID uuid.UUID) ([]*model.Asset, error)
	GetAssetCountByProject() (map[uuid.UUID]int64, error)
}

type assetService struct {
	assetRepo repository.AssetRepository
	auditHook AuditHook
}

func NewAssetServiceWithAudit(assetRepo repository.AssetRepository, auditHook AuditHook) AssetService {
	return &assetService{
		assetRepo: assetRepo,
		auditHook: auditHook,
	}
}

func NewAssetService(assetRepo repository.AssetRepository) AssetService {
	return &assetService{
		assetRepo: assetRepo,
		auditHook: nil, // 无审计钩子
	}
}

func (s *assetService) CreateAsset(asset *model.Asset, userID uuid.UUID) error {
	// 验证必填字段
	if asset.Name == "" {
		return errors.New("资产名称不能为空")
	}
	if asset.Type == "" {
		return errors.New("资产类型不能为空")
	}
	if asset.Status == "" {
		return errors.New("资产状态不能为空")
	}

	// TODO: 添加名称唯一性检查（需要实现 GetByName 方法）

	err := s.assetRepo.Create(asset)
	if err != nil {
		return err
	}

	// 记录审计日志
	if s.auditHook != nil {
		_ = s.auditHook.LogCreate("assets", asset.ID, userID, asset)
	}

	return nil
}

func (s *assetService) GetAsset(id uuid.UUID) (*model.Asset, error) {
	return s.assetRepo.GetByID(id)
}

func (s *assetService) ListAssets(offset, limit int, filters map[string]interface{}) ([]*model.Asset, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.assetRepo.List(offset, limit, filters)
}

func (s *assetService) UpdateAsset(id uuid.UUID, asset *model.Asset, userID uuid.UUID) error {
	existing, err := s.assetRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("资产不存在: %w", err)
	}

	oldData := *existing

	// 更新字段
	if asset.Name != "" {
		existing.Name = asset.Name
	}
	if asset.Type != "" {
		existing.Type = asset.Type
	}
	if asset.Status != "" {
		existing.Status = asset.Status
	}
	if asset.ProjectID != nil {
		existing.ProjectID = asset.ProjectID
	}
	// 更新 SSH 端口
	if asset.SSHPort > 0 {
		existing.SSHPort = asset.SSHPort
	}
	// 更新资产详细信息字段
	existing.IP = asset.IP
	existing.OS = asset.OS
	existing.CPU = asset.CPU
	existing.Memory = asset.Memory
	existing.Disk = asset.Disk
	existing.Location = asset.Location
	existing.Department = asset.Department
	existing.CloudPlatform = asset.CloudPlatform
	existing.Remark = asset.Remark

	err = s.assetRepo.Update(existing)
	if err != nil {
		return err
	}

	// 记录审计日志
	if s.auditHook != nil {
		_ = s.auditHook.LogUpdate("assets", id, userID, oldData, existing)
	}

	return nil
}

func (s *assetService) DeleteAsset(id uuid.UUID, userID uuid.UUID) error {
	// 检查资产是否存在
	asset, err := s.assetRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("资产不存在: %w", err)
	}

	err = s.assetRepo.Delete(id)
	if err != nil {
		return err
	}

	// 记录审计日志
	if s.auditHook != nil {
		_ = s.auditHook.LogDelete("assets", id, userID, asset)
	}

	return nil
}

func (s *assetService) GetAssetsByProjectID(projectID uuid.UUID) ([]*model.Asset, error) {
	return s.assetRepo.GetByProjectID(projectID)
}

func (s *assetService) GetAssetCountByProject() (map[uuid.UUID]int64, error) {
	return s.assetRepo.CountByProject()
}
