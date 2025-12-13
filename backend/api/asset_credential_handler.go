package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/model"
	"github.com/kmdb/kmdb/service"
)

type AssetCredentialHandler struct {
	credentialService service.AssetCredentialService
}

func NewAssetCredentialHandler(credentialService service.AssetCredentialService) *AssetCredentialHandler {
	return &AssetCredentialHandler{
		credentialService: credentialService,
	}
}

type CreateCredentialRequest struct {
	AssetID     *string `json:"asset_id,omitempty"` // 可选，不关联资产时为空
	Name        string  `json:"name" binding:"required"`
	Username    string  `json:"username" binding:"required"`
	AuthType    string  `json:"auth_type" binding:"required"` // password 或 key
	Password    *string `json:"password,omitempty"`
	PrivateKey  *string `json:"private_key,omitempty"`
	PublicKey   *string `json:"public_key,omitempty"`
	Passphrase  *string `json:"passphrase,omitempty"`
	Description string  `json:"description"`
	IsDefault   bool    `json:"is_default"`
}

type UpdateCredentialRequest struct {
	Name        string  `json:"name"`
	Username    string  `json:"username"`
	AuthType    string  `json:"auth_type"`
	Password    *string `json:"password,omitempty"`
	PrivateKey  *string `json:"private_key,omitempty"`
	PublicKey   *string `json:"public_key,omitempty"`
	Passphrase  *string `json:"passphrase,omitempty"`
	Description string  `json:"description"`
	IsDefault   bool    `json:"is_default"`
}

// CreateCredential 创建资产凭证
// @Summary 创建资产凭证
// @Tags asset-credentials
// @Accept json
// @Produce json
// @Param request body CreateCredentialRequest true "凭证信息"
// @Success 201 {object} model.AssetCredential
// @Router /api/v1/asset-credentials [post]
func (h *AssetCredentialHandler) CreateCredential(c *gin.Context) {
	var req CreateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	var assetID *uuid.UUID
	if req.AssetID != nil && *req.AssetID != "" {
		parsedID, err := uuid.Parse(*req.AssetID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
			return
		}
		assetID = &parsedID
	}

	credential := &model.AssetCredential{
		AssetID:     assetID,
		Name:        req.Name,
		Username:    req.Username,
		AuthType:    req.AuthType,
		Password:    req.Password,
		PrivateKey:  req.PrivateKey,
		PublicKey:   req.PublicKey,
		Passphrase:  req.Passphrase,
		Description: req.Description,
		IsDefault:   req.IsDefault,
	}

	if err := h.credentialService.CreateCredential(credential); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 返回时隐藏敏感信息
	credential.Password = nil
	credential.PrivateKey = nil
	credential.Passphrase = nil

	c.JSON(http.StatusCreated, credential)
}

// GetCredential 获取凭证详情
// @Summary 获取凭证详情
// @Tags asset-credentials
// @Produce json
// @Param id path string true "凭证ID"
// @Success 200 {object} model.AssetCredential
// @Router /api/v1/asset-credentials/{id} [get]
func (h *AssetCredentialHandler) GetCredential(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential ID"})
		return
	}

	credential, err := h.credentialService.GetCredential(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Credential not found"})
		return
	}

	// 隐藏敏感信息
	credential.Password = nil
	credential.PrivateKey = nil
	credential.Passphrase = nil

	c.JSON(http.StatusOK, credential)
}

// GetCredentialsByAsset 获取资产的凭证列表
// @Summary 获取资产的凭证列表
// @Tags asset-credentials
// @Produce json
// @Param id path string true "资产ID"
// @Success 200 {array} model.AssetCredential
// @Router /api/v1/assets/{id}/credentials [get]
func (h *AssetCredentialHandler) GetCredentialsByAsset(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	credentials, err := h.credentialService.GetCredentialsByAssetID(assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 隐藏敏感信息
	for _, cred := range credentials {
		cred.Password = nil
		cred.PrivateKey = nil
		cred.Passphrase = nil
	}

	c.JSON(http.StatusOK, credentials)
}

// GetAllCredentials 获取所有凭证（包括未关联资产的）
// @Summary 获取所有凭证
// @Tags asset-credentials
// @Produce json
// @Success 200 {array} model.AssetCredential
// @Router /api/v1/asset-credentials [get]
func (h *AssetCredentialHandler) GetAllCredentials(c *gin.Context) {
	credentials, err := h.credentialService.GetAllCredentials()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 隐藏敏感信息
	for _, cred := range credentials {
		cred.Password = nil
		cred.PrivateKey = nil
		cred.Passphrase = nil
	}

	c.JSON(http.StatusOK, credentials)
}

// UpdateCredential 更新凭证
// @Summary 更新凭证
// @Tags asset-credentials
// @Accept json
// @Produce json
// @Param id path string true "凭证ID"
// @Param request body UpdateCredentialRequest true "凭证信息"
// @Success 200 {object} model.AssetCredential
// @Router /api/v1/asset-credentials/{id} [put]
func (h *AssetCredentialHandler) UpdateCredential(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential ID"})
		return
	}

	var req UpdateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request", "details": err.Error()})
		return
	}

	credential := &model.AssetCredential{
		Name:        req.Name,
		Username:    req.Username,
		AuthType:    req.AuthType,
		Password:    req.Password,
		PrivateKey:  req.PrivateKey,
		PublicKey:   req.PublicKey,
		Passphrase:  req.Passphrase,
		Description: req.Description,
		IsDefault:   req.IsDefault,
	}

	if err := h.credentialService.UpdateCredential(id, credential); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, _ := h.credentialService.GetCredential(id)
	// 隐藏敏感信息
	updated.Password = nil
	updated.PrivateKey = nil
	updated.Passphrase = nil

	c.JSON(http.StatusOK, updated)
}

// DeleteCredential 删除凭证
// @Summary 删除凭证
// @Tags asset-credentials
// @Produce json
// @Param id path string true "凭证ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/asset-credentials/{id} [delete]
func (h *AssetCredentialHandler) DeleteCredential(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential ID"})
		return
	}

	if err := h.credentialService.DeleteCredential(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Credential deleted successfully"})
}

// SetDefaultCredential 设置默认凭证
// @Summary 设置默认凭证
// @Tags asset-credentials
// @Produce json
// @Param asset_id path string true "资产ID"
// @Param credential_id path string true "凭证ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/assets/{asset_id}/credentials/{credential_id}/set-default [post]
func (h *AssetCredentialHandler) SetDefaultCredential(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	credentialID, err := uuid.Parse(c.Param("credential_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credential ID"})
		return
	}

	if err := h.credentialService.SetDefaultCredential(assetID, credentialID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Default credential set successfully"})
}
