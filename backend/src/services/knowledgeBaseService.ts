/**
 * Knowledge Base Service - TASK-038D
 * 
 * Manages knowledge base articles, FAQs, and self-service resources
 * Provides search and categorization for customer support documentation
 */

import { getPrismaClient } from './prisma';
import { logger } from '../utils/logger';

const prisma = getPrismaClient();

export class KnowledgeBaseService {
  /**
   * SUBTASK-038D-004-1: Create knowledge base article
   */
  async createArticle(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    category: string;
    tags?: string[];
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    authorId: string;
  }) {
    try {
      const createData: any = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        category: data.category as any,
        tags: data.tags || [],
        status: data.status || 'DRAFT',
        authorId: data.authorId,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0
      };
      
      if (data.excerpt) createData.excerpt = data.excerpt;
      if (data.status === 'PUBLISHED') createData.publishedAt = new Date();
      
      const article = await prisma.knowledgeBaseArticle.create({
        data: createData
      });

      logger.info(`Created knowledge base article: ${article.title}`);

      return article;
    } catch (error) {
      logger.error('Error creating knowledge base article:', error);
      throw new Error('Failed to create knowledge base article');
    }
  }

  /**
   * SUBTASK-038D-004-2: Update knowledge base article
   */
  async updateArticle(articleId: string, data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    category?: string;
    tags?: string[];
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  }) {
    try {
      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.slug) updateData.slug = data.slug;
      if (data.content) updateData.content = data.content;
      if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
      if (data.category) updateData.category = data.category as any;
      if (data.tags) updateData.tags = data.tags;
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'PUBLISHED') {
          updateData.publishedAt = new Date();
        }
      }
      
      const article = await prisma.knowledgeBaseArticle.update({
        where: { id: articleId },
        data: updateData
      });

      logger.info(`Updated knowledge base article: ${article.title}`);

      return article;
    } catch (error) {
      logger.error(`Error updating article ${articleId}:`, error);
      throw new Error('Failed to update knowledge base article');
    }
  }

  /**
   * SUBTASK-038D-004-3: List articles with filtering
   */
  async listArticles(filters: {
    category?: string;
    tags?: string[];
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    try {
      const {
        category,
        tags,
        status,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags
        };
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [articles, total] = await Promise.all([
        prisma.knowledgeBaseArticle.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            slug: true,
            title: true,
            content: true,
            excerpt: true,
            category: true,
            tags: true,
            status: true,
            publishedAt: true,
            viewCount: true,
            helpfulCount: true,
            createdAt: true,
            updatedAt: true,
            authorId: true
          }
        }),
        prisma.knowledgeBaseArticle.count({ where })
      ]);

      logger.info(`Listed ${articles.length} knowledge base articles`);

      return {
        articles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing knowledge base articles:', error);
      throw new Error('Failed to list knowledge base articles');
    }
  }

  /**
   * SUBTASK-038D-004-4: Get article by ID
   */
  async getArticleById(articleId: string, incrementView: boolean = false) {
    try {
      const article = await prisma.knowledgeBaseArticle.findUnique({
        where: { id: articleId }
      });

      if (!article) {
        throw new Error('Article not found');
      }

      // Increment view count if requested
      if (incrementView) {
        await prisma.knowledgeBaseArticle.update({
          where: { id: articleId },
          data: { viewCount: { increment: 1 } }
        });
        article.viewCount += 1;
      }

      logger.info(`Retrieved article: ${article.title}${incrementView ? ' (view counted)' : ''}`);

      return article;
    } catch (error) {
      logger.error(`Error getting article ${articleId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038D-004-5: Search articles
   */
  async searchArticles(query: string, filters: {
    category?: string;
    tags?: string[];
    limit?: number;
  } = {}) {
    try {
      const {
        category,
        tags,
        limit = 10
      } = filters;

      const where: any = {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } }
        ]
      };

      if (category) {
        where.category = category;
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags
        };
      }

      const articles = await prisma.knowledgeBaseArticle.findMany({
        where,
        take: limit,
        orderBy: [
          { viewCount: 'desc' },
          { helpfulCount: 'desc' }
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          tags: true,
          viewCount: true,
          helpfulCount: true
        }
      });

      logger.info(`Search for "${query}" returned ${articles.length} results`);

      return articles;
    } catch (error) {
      logger.error(`Error searching articles with query "${query}":`, error);
      throw new Error('Failed to search articles');
    }
  }

  /**
   * SUBTASK-038D-004-6: Mark article as helpful
   */
  async markArticleHelpful(articleId: string) {
    try {
      const article = await prisma.knowledgeBaseArticle.update({
        where: { id: articleId },
        data: {
          helpfulCount: { increment: 1 }
        }
      });

      logger.info(`Marked article ${articleId} as helpful`);

      return article;
    } catch (error) {
      logger.error(`Error marking article ${articleId} as helpful:`, error);
      throw new Error('Failed to mark article as helpful');
    }
  }

  /**
   * SUBTASK-038D-004-7: Get popular articles
   */
  async getPopularArticles(category?: string, limit: number = 10) {
    try {
      const where: any = {
        status: 'PUBLISHED'
      };

      if (category) {
        where.category = category;
      }

      const articles = await prisma.knowledgeBaseArticle.findMany({
        where,
        take: limit,
        orderBy: [
          { viewCount: 'desc' },
          { helpfulCount: 'desc' }
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          tags: true,
          viewCount: true,
          helpfulCount: true,
          createdAt: true
        }
      });

      logger.info(`Retrieved ${articles.length} popular articles`);

      return articles;
    } catch (error) {
      logger.error('Error getting popular articles:', error);
      throw new Error('Failed to get popular articles');
    }
  }

  /**
   * SUBTASK-038D-004-8: Get recent articles
   */
  async getRecentArticles(limit: number = 10) {
    try {
      const articles = await prisma.knowledgeBaseArticle.findMany({
        where: {
          status: 'PUBLISHED'
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          tags: true,
          viewCount: true,
          createdAt: true
        }
      });

      logger.info(`Retrieved ${articles.length} recent articles`);

      return articles;
    } catch (error) {
      logger.error('Error getting recent articles:', error);
      throw new Error('Failed to get recent articles');
    }
  }

  /**
   * SUBTASK-038D-004-9: Get articles by category
   */
  async getArticlesByCategory() {
    try {
      const categoryCounts = await prisma.knowledgeBaseArticle.groupBy({
        by: ['category'],
        where: {
          status: 'PUBLISHED'
        },
        _count: true
      });

      const categoryData = await Promise.all(
        categoryCounts.map(async (item) => {
          const articles = await prisma.knowledgeBaseArticle.findMany({
            where: {
              category: item.category,
              status: 'PUBLISHED'
            },
            take: 5,
            orderBy: { viewCount: 'desc' },
            select: {
              id: true,
              slug: true,
              title: true,
              excerpt: true,
              viewCount: true
            }
          });

          return {
            category: item.category,
            count: item._count,
            topArticles: articles
          };
        })
      );

      logger.info('Retrieved articles grouped by category');

      return categoryData;
    } catch (error) {
      logger.error('Error getting articles by category:', error);
      throw new Error('Failed to get articles by category');
    }
  }

  /**
   * SUBTASK-038D-004-10: Delete article
   */
  async deleteArticle(articleId: string) {
    try {
      await prisma.knowledgeBaseArticle.delete({
        where: { id: articleId }
      });

      logger.info(`Deleted knowledge base article: ${articleId}`);

      return { success: true };
    } catch (error) {
      logger.error(`Error deleting article ${articleId}:`, error);
      throw new Error('Failed to delete article');
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats() {
    try {
      const [
        totalArticles,
        publishedArticles,
        draftArticles,
        totalViews,
        totalHelpful,
        byCategory
      ] = await Promise.all([
        prisma.knowledgeBaseArticle.count(),
        prisma.knowledgeBaseArticle.count({ where: { status: 'PUBLISHED' } }),
        prisma.knowledgeBaseArticle.count({ where: { status: 'DRAFT' } }),
        prisma.knowledgeBaseArticle.aggregate({
          _sum: { viewCount: true }
        }),
        prisma.knowledgeBaseArticle.aggregate({
          _sum: { helpfulCount: true }
        }),
        prisma.knowledgeBaseArticle.groupBy({
          by: ['category'],
          _count: true
        })
      ]);

      const stats = {
        totalArticles,
        publishedArticles,
        draftArticles,
        totalViews: totalViews._sum.viewCount || 0,
        totalHelpful: totalHelpful._sum.helpfulCount || 0,
        avgViewsPerArticle: publishedArticles > 0
          ? Math.round((totalViews._sum.viewCount || 0) / publishedArticles)
          : 0,
        byCategory: byCategory.reduce((acc: any, item) => {
          acc[item.category] = item._count;
          return acc;
        }, {})
      };

      logger.info('Generated knowledge base statistics');

      return stats;
    } catch (error) {
      logger.error('Error getting knowledge base stats:', error);
      throw new Error('Failed to get knowledge base stats');
    }
  }

  /**
   * Get article performance metrics
   */
  async getArticlePerformance(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentArticles = await prisma.knowledgeBaseArticle.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          category: true,
          viewCount: true,
          helpfulCount: true,
          createdAt: true
        },
        orderBy: { viewCount: 'desc' },
        take: 20
      });

      const topPerformers = recentArticles.map(article => ({
        ...article,
        helpfulRate: article.viewCount > 0
          ? Math.round((article.helpfulCount / article.viewCount) * 100)
          : 0
      }));

      logger.info(`Generated performance metrics for ${days} days`);

      return {
        period: `Last ${days} days`,
        topPerformers,
        avgViews: topPerformers.length > 0
          ? Math.round(topPerformers.reduce((sum, a) => sum + a.viewCount, 0) / topPerformers.length)
          : 0,
        avgHelpfulRate: topPerformers.length > 0
          ? Math.round(topPerformers.reduce((sum, a) => sum + a.helpfulRate, 0) / topPerformers.length)
          : 0
      };
    } catch (error) {
      logger.error('Error getting article performance:', error);
      throw new Error('Failed to get article performance');
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
