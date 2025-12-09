package repository

import (
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"gorm.io/gorm"
)

type TeamRepository interface {
	Create(team *model.Team) error
	GetByID(id uuid.UUID) (*model.Team, error)
	GetByName(name string) (*model.Team, error)
	List(offset, limit int) ([]*model.Team, int64, error)
	Update(team *model.Team) error
	Delete(id uuid.UUID) error

	// 成员管理
	AddMember(member *model.TeamMember) error
	RemoveMember(teamID, userID uuid.UUID) error
	GetMembers(teamID uuid.UUID) ([]*model.TeamMember, error)
	GetUserTeams(userID uuid.UUID) ([]*model.Team, error)
	IsMember(teamID, userID uuid.UUID) (bool, error)
	GetMemberRole(teamID, userID uuid.UUID) (string, error)
	UpdateMemberRole(teamID, userID uuid.UUID, role string) error
}

type teamRepository struct {
	db *gorm.DB
}

func NewTeamRepository(db *gorm.DB) TeamRepository {
	return &teamRepository{db: db}
}

func (r *teamRepository) Create(team *model.Team) error {
	return r.db.Create(team).Error
}

func (r *teamRepository) GetByID(id uuid.UUID) (*model.Team, error) {
	var team model.Team
	err := r.db.Preload("Members.User").First(&team, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &team, nil
}

func (r *teamRepository) GetByName(name string) (*model.Team, error) {
	var team model.Team
	err := r.db.First(&team, "name = ?", name).Error
	if err != nil {
		return nil, err
	}
	return &team, nil
}

func (r *teamRepository) List(offset, limit int) ([]*model.Team, int64, error) {
	var teams []*model.Team
	var total int64

	err := r.db.Model(&model.Team{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = r.db.Preload("Members").
		Order("name ASC").
		Offset(offset).
		Limit(limit).
		Find(&teams).Error
	if err != nil {
		return nil, 0, err
	}

	return teams, total, nil
}

func (r *teamRepository) Update(team *model.Team) error {
	return r.db.Save(team).Error
}

func (r *teamRepository) Delete(id uuid.UUID) error {
	// 先删除成员关联
	if err := r.db.Delete(&model.TeamMember{}, "team_id = ?", id).Error; err != nil {
		return err
	}
	return r.db.Delete(&model.Team{}, "id = ?", id).Error
}

func (r *teamRepository) AddMember(member *model.TeamMember) error {
	return r.db.Create(member).Error
}

func (r *teamRepository) RemoveMember(teamID, userID uuid.UUID) error {
	return r.db.Delete(&model.TeamMember{}, "team_id = ? AND user_id = ?", teamID, userID).Error
}

func (r *teamRepository) GetMembers(teamID uuid.UUID) ([]*model.TeamMember, error) {
	var members []*model.TeamMember
	err := r.db.Preload("User").
		Where("team_id = ?", teamID).
		Order("created_at ASC").
		Find(&members).Error
	return members, err
}

func (r *teamRepository) GetUserTeams(userID uuid.UUID) ([]*model.Team, error) {
	var teams []*model.Team
	err := r.db.Joins("JOIN team_members ON teams.id = team_members.team_id").
		Where("team_members.user_id = ?", userID).
		Find(&teams).Error
	return teams, err
}

func (r *teamRepository) IsMember(teamID, userID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.TeamMember{}).
		Where("team_id = ? AND user_id = ?", teamID, userID).
		Count(&count).Error
	return count > 0, err
}

func (r *teamRepository) GetMemberRole(teamID, userID uuid.UUID) (string, error) {
	var member model.TeamMember
	err := r.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error
	if err != nil {
		return "", err
	}
	return member.Role, nil
}

func (r *teamRepository) UpdateMemberRole(teamID, userID uuid.UUID, role string) error {
	return r.db.Model(&model.TeamMember{}).
		Where("team_id = ? AND user_id = ?", teamID, userID).
		Update("role", role).Error
}

