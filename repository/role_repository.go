package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type RoleRepository interface {
	Create(role *model.Role) error
	GetByID(id uuid.UUID) (*model.Role, error)
	List(offset, limit int) ([]*model.Role, int64, error)
	Update(role *model.Role) error
	Delete(id uuid.UUID) error
}

type PermissionRepository interface {
	Create(permission *model.Permission) error
	GetByID(id uuid.UUID) (*model.Permission, error)
	List() ([]*model.Permission, error)
	GetByResource(resource string) ([]*model.Permission, error)
}

type RolePermissionRepository interface {
	AssignPermission(roleID, permissionID uuid.UUID) error
	RevokePermission(roleID, permissionID uuid.UUID) error
	GetRolePermissions(roleID uuid.UUID) ([]*model.Permission, error)
	GetPermissionRoles(permissionID uuid.UUID) ([]*model.Role, error)
	HasPermission(roleID, permissionID uuid.UUID) (bool, error)
}

type UserRoleRepository interface {
	AssignRole(userID, roleID uuid.UUID) error
	RevokeRole(userID, roleID uuid.UUID) error
	GetUserRoles(userID uuid.UUID) ([]*model.Role, error)
	GetRoleUsers(roleID uuid.UUID) ([]*model.User, error)
	HasRole(userID, roleID uuid.UUID) (bool, error)
}

type GroupRoleRepository interface {
	AssignRole(groupID, roleID uuid.UUID) error
	RevokeRole(groupID, roleID uuid.UUID) error
	GetGroupRoles(groupID uuid.UUID) ([]*model.Role, error)
	GetRoleGroups(roleID uuid.UUID) ([]*model.UserGroup, error)
	HasRole(groupID, roleID uuid.UUID) (bool, error)
}

type roleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) Create(role *model.Role) error {
	return r.db.Create(role).Error
}

func (r *roleRepository) GetByID(id uuid.UUID) (*model.Role, error) {
	var role model.Role
	err := r.db.Where("id = ?", id).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) List(offset, limit int) ([]*model.Role, int64, error) {
	var roles []*model.Role
	var total int64

	if err := r.db.Model(&model.Role{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&roles).Error
	return roles, total, err
}

func (r *roleRepository) Update(role *model.Role) error {
	return r.db.Save(role).Error
}

func (r *roleRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Role{}, id).Error
}

type permissionRepository struct {
	db *gorm.DB
}

func NewPermissionRepository(db *gorm.DB) PermissionRepository {
	return &permissionRepository{db: db}
}

func (r *permissionRepository) Create(permission *model.Permission) error {
	return r.db.Create(permission).Error
}

func (r *permissionRepository) GetByID(id uuid.UUID) (*model.Permission, error) {
	var permission model.Permission
	err := r.db.Where("id = ?", id).First(&permission).Error
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *permissionRepository) List() ([]*model.Permission, error) {
	var permissions []*model.Permission
	err := r.db.Order("resource, action").Find(&permissions).Error
	return permissions, err
}

func (r *permissionRepository) GetByResource(resource string) ([]*model.Permission, error) {
	var permissions []*model.Permission
	err := r.db.Where("resource = ?", resource).Find(&permissions).Error
	return permissions, err
}

type rolePermissionRepository struct {
	db *gorm.DB
}

func NewRolePermissionRepository(db *gorm.DB) RolePermissionRepository {
	return &rolePermissionRepository{db: db}
}

func (r *rolePermissionRepository) AssignPermission(roleID, permissionID uuid.UUID) error {
	rp := &model.RolePermission{
		RoleID:       roleID,
		PermissionID: permissionID,
	}
	return r.db.Create(rp).Error
}

func (r *rolePermissionRepository) RevokePermission(roleID, permissionID uuid.UUID) error {
	return r.db.Where("role_id = ? AND permission_id = ?", roleID, permissionID).
		Delete(&model.RolePermission{}).Error
}

func (r *rolePermissionRepository) GetRolePermissions(roleID uuid.UUID) ([]*model.Permission, error) {
	var permissions []*model.Permission
	err := r.db.Table("permissions").
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", roleID).
		Find(&permissions).Error
	return permissions, err
}

func (r *rolePermissionRepository) GetPermissionRoles(permissionID uuid.UUID) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.Table("roles").
		Joins("JOIN role_permissions ON roles.id = role_permissions.role_id").
		Where("role_permissions.permission_id = ?", permissionID).
		Find(&roles).Error
	return roles, err
}

func (r *rolePermissionRepository) HasPermission(roleID, permissionID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.RolePermission{}).
		Where("role_id = ? AND permission_id = ?", roleID, permissionID).
		Count(&count).Error
	return count > 0, err
}

type userRoleRepository struct {
	db *gorm.DB
}

func NewUserRoleRepository(db *gorm.DB) UserRoleRepository {
	return &userRoleRepository{db: db}
}

func (r *userRoleRepository) AssignRole(userID, roleID uuid.UUID) error {
	ur := &model.UserRole{
		UserID: userID,
		RoleID: roleID,
	}
	return r.db.Create(ur).Error
}

func (r *userRoleRepository) RevokeRole(userID, roleID uuid.UUID) error {
	return r.db.Where("user_id = ? AND role_id = ?", userID, roleID).
		Delete(&model.UserRole{}).Error
}

func (r *userRoleRepository) GetUserRoles(userID uuid.UUID) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.Table("roles").
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error
	return roles, err
}

func (r *userRoleRepository) GetRoleUsers(roleID uuid.UUID) ([]*model.User, error) {
	var users []*model.User
	err := r.db.Table("users").
		Joins("JOIN user_roles ON users.id = user_roles.user_id").
		Where("user_roles.role_id = ?", roleID).
		Find(&users).Error
	return users, err
}

func (r *userRoleRepository) HasRole(userID, roleID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.UserRole{}).
		Where("user_id = ? AND role_id = ?", userID, roleID).
		Count(&count).Error
	return count > 0, err
}

type groupRoleRepository struct {
	db *gorm.DB
}

func NewGroupRoleRepository(db *gorm.DB) GroupRoleRepository {
	return &groupRoleRepository{db: db}
}

func (r *groupRoleRepository) AssignRole(groupID, roleID uuid.UUID) error {
	gr := &model.GroupRole{
		GroupID: groupID,
		RoleID:  roleID,
	}
	return r.db.Create(gr).Error
}

func (r *groupRoleRepository) RevokeRole(groupID, roleID uuid.UUID) error {
	return r.db.Where("group_id = ? AND role_id = ?", groupID, roleID).
		Delete(&model.GroupRole{}).Error
}

func (r *groupRoleRepository) GetGroupRoles(groupID uuid.UUID) ([]*model.Role, error) {
	var roles []*model.Role
	err := r.db.Table("roles").
		Joins("JOIN group_roles ON roles.id = group_roles.role_id").
		Where("group_roles.group_id = ?", groupID).
		Find(&roles).Error
	return roles, err
}

func (r *groupRoleRepository) GetRoleGroups(roleID uuid.UUID) ([]*model.UserGroup, error) {
	var groups []*model.UserGroup
	err := r.db.Table("user_groups").
		Joins("JOIN group_roles ON user_groups.id = group_roles.group_id").
		Where("group_roles.role_id = ?", roleID).
		Find(&groups).Error
	return groups, err
}

func (r *groupRoleRepository) HasRole(groupID, roleID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.GroupRole{}).
		Where("group_id = ? AND role_id = ?", groupID, roleID).
		Count(&count).Error
	return count > 0, err
}

