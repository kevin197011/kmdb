package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/repository"
)

type ProjectService interface {
	CreateProject(project *model.Project) error
	GetProject(id uuid.UUID) (*model.Project, error)
	GetProjectByName(name string) (*model.Project, error)
	ListProjects(offset, limit int) ([]*model.Project, int64, error)
	UpdateProject(id uuid.UUID, project *model.Project) error
	DeleteProject(id uuid.UUID) error
	GetProjectAssets(projectID uuid.UUID) ([]*model.Asset, error)
}

type projectService struct {
	projectRepo repository.ProjectRepository
	assetRepo   repository.AssetRepository
}

func NewProjectService(projectRepo repository.ProjectRepository, assetRepo repository.AssetRepository) ProjectService {
	return &projectService{
		projectRepo: projectRepo,
		assetRepo:   assetRepo,
	}
}

func (s *projectService) CreateProject(project *model.Project) error {
	if project.Name == "" {
		return errors.New("项目名称不能为空")
	}

	// 检查项目名称是否已存在
	existing, err := s.projectRepo.GetByName(project.Name)
	if err == nil && existing != nil {
		return errors.New("项目名称已存在")
	}

	if project.Status == "" {
		project.Status = "active"
	}

	return s.projectRepo.Create(project)
}

func (s *projectService) GetProject(id uuid.UUID) (*model.Project, error) {
	return s.projectRepo.GetByID(id)
}

func (s *projectService) GetProjectByName(name string) (*model.Project, error) {
	return s.projectRepo.GetByName(name)
}

func (s *projectService) ListProjects(offset, limit int) ([]*model.Project, int64, error) {
	return s.projectRepo.List(offset, limit)
}

func (s *projectService) UpdateProject(id uuid.UUID, project *model.Project) error {
	existing, err := s.projectRepo.GetByID(id)
	if err != nil {
		return errors.New("项目不存在")
	}

	if project.Name != "" && project.Name != existing.Name {
		// 检查新名称是否已存在
		duplicate, err := s.projectRepo.GetByName(project.Name)
		if err == nil && duplicate != nil && duplicate.ID != id {
			return errors.New("项目名称已存在")
		}
		existing.Name = project.Name
	}

	if project.Description != "" {
		existing.Description = project.Description
	}

	if project.Status != "" {
		existing.Status = project.Status
	}

	return s.projectRepo.Update(existing)
}

func (s *projectService) DeleteProject(id uuid.UUID) error {
	// 检查是否有资产关联到此项目
	assets, err := s.projectRepo.GetAssetsByProjectID(id)
	if err == nil && len(assets) > 0 {
		return errors.New("项目下存在资产，无法删除")
	}

	return s.projectRepo.Delete(id)
}

func (s *projectService) GetProjectAssets(projectID uuid.UUID) ([]*model.Asset, error) {
	return s.projectRepo.GetAssetsByProjectID(projectID)
}
