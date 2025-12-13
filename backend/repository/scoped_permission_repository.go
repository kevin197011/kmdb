package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type ScopedPermissionRepository interface {
	// 基本 CRUD
	Create(permission *model.ScopedPermission) error
	Delete(id uuid.UUID) error
	GetByID(id uuid.UUID) (*model.ScopedPermission, error)

	// 按主体查询
	GetBySubject(subjectType string, subjectID uuid.UUID) ([]*model.ScopedPermission, error)

	// 按资源查询
	GetByResource(resourceType string, resourceID *uuid.UUID) ([]*model.ScopedPermission, error)

	// 检查是否存在特定权限
	HasPermission(subjectType string, subjectID uuid.UUID, resourceType string, resourceID *uuid.UUID, action string) (bool, error)

	// 批量检查权限（高性能）
	CheckPermissions(subjectType string, subjectID uuid.UUID, checks []PermissionCheck) (map[string]bool, error)

	// 获取用户的所有权限（包括直接权限、角色权限、团队权限）
	GetUserAllPermissions(userID uuid.UUID, teamIDs []uuid.UUID, roleIDs []uuid.UUID) ([]*model.ScopedPermission, error)

	// 删除主体的所有权限
	DeleteBySubject(subjectType string, subjectID uuid.UUID) error

	// 删除资源的所有权限
	DeleteByResource(resourceType string, resourceID uuid.UUID) error

	// 列表查询
	List(offset, limit int, filters map[string]interface{}) ([]*model.ScopedPermission, int64, error)
}

// PermissionCheck 权限检查请求
type PermissionCheck struct {
	ResourceType string
	ResourceID   *uuid.UUID
	Action       string
}

type scopedPermissionRepository struct {
	db *gorm.DB
}

func NewScopedPermissionRepository(db *gorm.DB) ScopedPermissionRepository {
	return &scopedPermissionRepository{db: db}
}

func (r *scopedPermissionRepository) Create(permission *model.ScopedPermission) error {
	return r.db.Create(permission).Error
}

func (r *scopedPermissionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ScopedPermission{}, "id = ?", id).Error
}

func (r *scopedPermissionRepository) GetByID(id uuid.UUID) (*model.ScopedPermission, error) {
	var permission model.ScopedPermission
	err := r.db.First(&permission, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *scopedPermissionRepository) GetBySubject(subjectType string, subjectID uuid.UUID) ([]*model.ScopedPermission, error) {
	var permissions []*model.ScopedPermission
	err := r.db.Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).
		Order("resource_type, action").
		Find(&permissions).Error
	return permissions, err
}

func (r *scopedPermissionRepository) GetByResource(resourceType string, resourceID *uuid.UUID) ([]*model.ScopedPermission, error) {
	var permissions []*model.ScopedPermission
	query := r.db.Where("resource_type = ?", resourceType)
	if resourceID != nil {
		query = query.Where("resource_id = ? OR resource_id IS NULL", resourceID)
	}
	err := query.Order("subject_type, action").Find(&permissions).Error
	return permissions, err
}

func (r *scopedPermissionRepository) HasPermission(subjectType string, subjectID uuid.UUID, resourceType string, resourceID *uuid.UUID, action string) (bool, error) {
	var count int64

	query := r.db.Model(&model.ScopedPermission{}).
		Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).
		Where("(resource_type = ? OR resource_type = ?)", resourceType, model.ResourceTypeAll).
		Where("(action = ? OR action = ?)", action, model.ActionAll)

	if resourceID != nil {
		query = query.Where("(resource_id = ? OR resource_id IS NULL)", resourceID)
	} else {
		query = query.Where("resource_id IS NULL")
	}

	err := query.Count(&count).Error
	return count > 0, err
}

func (r *scopedPermissionRepository) CheckPermissions(subjectType string, subjectID uuid.UUID, checks []PermissionCheck) (map[string]bool, error) {
	result := make(map[string]bool)

	// 获取该主体的所有权限
	permissions, err := r.GetBySubject(subjectType, subjectID)
	if err != nil {
		return nil, err
	}

	// 检查每个请求
	for _, check := range checks {
		key := check.ResourceType + ":" + check.Action
		if check.ResourceID != nil {
			key = check.ResourceType + ":" + check.ResourceID.String() + ":" + check.Action
		}

		result[key] = false
		for _, perm := range permissions {
			// 检查资源类型匹配
			if perm.ResourceType != model.ResourceTypeAll && perm.ResourceType != check.ResourceType {
				continue
			}

			// 检查资源 ID 匹配
			if perm.ResourceID != nil && check.ResourceID != nil && *perm.ResourceID != *check.ResourceID {
				continue
			}

			// 检查操作匹配
			if perm.Action != model.ActionAll && perm.Action != check.Action {
				continue
			}

			result[key] = true
			break
		}
	}

	return result, nil
}

func (r *scopedPermissionRepository) GetUserAllPermissions(userID uuid.UUID, teamIDs []uuid.UUID, roleIDs []uuid.UUID) ([]*model.ScopedPermission, error) {
	var permissions []*model.ScopedPermission

	// 构建查询条件
	query := r.db.Where(
		"(subject_type = ? AND subject_id = ?)",
		model.SubjectTypeUser, userID,
	)

	// 添加团队权限
	if len(teamIDs) > 0 {
		query = query.Or("(subject_type = ? AND subject_id IN ?)", model.SubjectTypeTeam, teamIDs)
	}

	// 注意：roleIDs 参数保留以兼容接口，但不再使用

	err := query.Order("resource_type, action").Find(&permissions).Error
	return permissions, err
}

func (r *scopedPermissionRepository) DeleteBySubject(subjectType string, subjectID uuid.UUID) error {
	return r.db.Delete(&model.ScopedPermission{}, "subject_type = ? AND subject_id = ?", subjectType, subjectID).Error
}

func (r *scopedPermissionRepository) DeleteByResource(resourceType string, resourceID uuid.UUID) error {
	return r.db.Delete(&model.ScopedPermission{}, "resource_type = ? AND resource_id = ?", resourceType, resourceID).Error
}

func (r *scopedPermissionRepository) List(offset, limit int, filters map[string]interface{}) ([]*model.ScopedPermission, int64, error) {
	var permissions []*model.ScopedPermission
	var total int64

	query := r.db.Model(&model.ScopedPermission{})

	// 应用过滤条件
	for key, value := range filters {
		query = query.Where(key+" = ?", value)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&permissions).Error
	if err != nil {
		return nil, 0, err
	}

	return permissions, total, nil
}

