package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type ProjectRepository interface {
	Create(project *model.Project) error
	GetByID(id uuid.UUID) (*model.Project, error)
	GetByName(name string) (*model.Project, error)
	List(offset, limit int) ([]*model.Project, int64, error)
	Update(project *model.Project) error
	Delete(id uuid.UUID) error
	GetAssetsByProjectID(projectID uuid.UUID) ([]*model.Asset, error)
}

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) Create(project *model.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepository) GetByID(id uuid.UUID) (*model.Project, error) {
	var project model.Project
	err := r.db.Where("id = ?", id).First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *projectRepository) GetByName(name string) (*model.Project, error) {
	var project model.Project
	err := r.db.Where("name = ?", name).First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *projectRepository) List(offset, limit int) ([]*model.Project, int64, error) {
	var projects []*model.Project
	var total int64

	err := r.db.Model(&model.Project{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = r.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&projects).Error
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *projectRepository) Update(project *model.Project) error {
	return r.db.Save(project).Error
}

func (r *projectRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Project{}, id).Error
}

func (r *projectRepository) GetAssetsByProjectID(projectID uuid.UUID) ([]*model.Asset, error) {
	var assets []*model.Asset
	err := r.db.Where("project_id = ?", projectID).Find(&assets).Error
	return assets, err
}
