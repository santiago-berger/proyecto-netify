import { matchedData } from "express-validator";
import { Article } from "../models/index.js";

// GET /api/articles  (GF-12)  -> lista, con filtro opcional por tema
export const getArticles = async (req, res) => {
  try {
    const where = {};
    if (req.query.topic) where.topic = req.query.topic;

    const articles = await Article.findAll({
      where,
      attributes: ["id", "title", "summary", "topic", "created_at"],
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json(articles);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los artículos", error: error.message });
  }
};

// GET /api/articles/:id  (GF-12)
export const getArticleById = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const article = await Article.findByPk(id);
    if (!article)
      return res.status(404).json({ message: "Artículo no encontrado" });
    return res.status(200).json(article);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el artículo", error: error.message });
  }
};
