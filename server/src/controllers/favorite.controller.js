import { matchedData } from "express-validator";
import { Favorite, Article } from "../models/index.js";

// GET /api/favorites  (GF-13)
export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      attributes: ["article_id"],
      raw: true,
    });
    const ids = favorites.map((f) => f.article_id);

    const articles = ids.length
      ? await Article.findAll({
          where: { id: ids },
          attributes: ["id", "title", "summary", "topic"],
        })
      : [];

    return res.status(200).json(articles);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los favoritos", error: error.message });
  }
};

// POST /api/favorites  (GF-13)
export const addFavorite = async (req, res) => {
  try {
    const { article_id } = matchedData(req, { locations: ["body"] });

    const exists = await Favorite.findOne({
      where: { user_id: req.user.id, article_id },
    });
    if (exists)
      return res.status(400).json({ message: "El artículo ya está en favoritos" });

    await Favorite.create({ user_id: req.user.id, article_id });
    return res.status(201).json({ message: "Agregado a favoritos" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al agregar el favorito", error: error.message });
  }
};

// DELETE /api/favorites/:article_id  (GF-13)
export const removeFavorite = async (req, res) => {
  try {
    const { article_id } = matchedData(req, { locations: ["params"] });
    const fav = await Favorite.findOne({
      where: { user_id: req.user.id, article_id },
    });
    if (!fav) return res.status(404).json({ message: "Favorito no encontrado" });

    await fav.destroy();
    return res.status(200).json({ message: "Quitado de favoritos" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al quitar el favorito", error: error.message });
  }
};
