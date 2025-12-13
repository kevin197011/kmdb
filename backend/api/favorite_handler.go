package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kmdb/kmdb/service"
)

type FavoriteHandler struct {
	favoriteService service.FavoriteService
}

func NewFavoriteHandler(favoriteService service.FavoriteService) *FavoriteHandler {
	return &FavoriteHandler{
		favoriteService: favoriteService,
	}
}

// AddFavorite 添加收藏
// @Summary 添加资产收藏
// @Tags favorites
// @Produce json
// @Param asset_id path string true "资产ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/assets/{asset_id}/favorite [post]
func (h *FavoriteHandler) AddFavorite(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := h.favoriteService.AddFavorite(userID.(uuid.UUID), assetID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Added to favorites"})
}

// RemoveFavorite 移除收藏
// @Summary 移除资产收藏
// @Tags favorites
// @Produce json
// @Param asset_id path string true "资产ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/assets/{asset_id}/favorite [delete]
func (h *FavoriteHandler) RemoveFavorite(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := h.favoriteService.RemoveFavorite(userID.(uuid.UUID), assetID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from favorites"})
}

// IsFavorite 检查是否收藏
// @Summary 检查资产是否已收藏
// @Tags favorites
// @Produce json
// @Param asset_id path string true "资产ID"
// @Success 200 {object} map[string]bool
// @Router /api/v1/assets/{asset_id}/favorite [get]
func (h *FavoriteHandler) IsFavorite(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("asset_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	isFavorite, err := h.favoriteService.IsFavorite(userID.(uuid.UUID), assetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_favorite": isFavorite})
}

// GetUserFavorites 获取用户收藏列表
// @Summary 获取用户收藏的资产列表
// @Tags favorites
// @Produce json
// @Success 200 {array} model.Asset
// @Router /api/v1/favorites [get]
func (h *FavoriteHandler) GetUserFavorites(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	favorites, err := h.favoriteService.GetUserFavorites(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, favorites)
}

