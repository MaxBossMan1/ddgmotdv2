module.exports = (sequelize, DataTypes) => {
  const Rule = sequelize.define('Rule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    subtitle: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    content_raw: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Raw content before HTML processing'
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    slug: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: true,
        is: /^[a-z0-9-]+$/
      }
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Order within category'
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    search_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for better search and organization'
    },
    meta_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata like icons, colors, etc.'
    },
    punishment_info: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Punishment guidelines for this rule'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'For temporary rules'
    },
    search_vector: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Preprocessed search content'
    }
  }, {
    tableName: 'rules',
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['is_published']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['order_index']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['updated_by']
      },
      {
        fields: ['published_at']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['view_count']
      },
      {
        name: 'search_vector_idx',
        fields: ['search_vector'],
        type: 'FULLTEXT'
      }
    ],
    hooks: {
      beforeCreate: (rule) => {
        // Generate slug if not provided
        if (!rule.slug && rule.title) {
          rule.slug = rule.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        }
        
        // Set published_at if being published
        if (rule.is_published && !rule.published_at) {
          rule.published_at = new Date();
        }
        
        // Update search vector
        rule.search_vector = createSearchVector(rule);
      },
      beforeUpdate: (rule) => {
        // Update published_at if being published
        if (rule.changed('is_published') && rule.is_published && !rule.published_at) {
          rule.published_at = new Date();
        }
        
        // Update search vector if content changed
        if (rule.changed('title') || rule.changed('content') || rule.changed('tags')) {
          rule.search_vector = createSearchVector(rule);
        }
        
        // Increment version if content changed
        if (rule.changed('content') || rule.changed('title')) {
          rule.version += 1;
        }
      }
    }
  });

  // Helper function to create search vector
  function createSearchVector(rule) {
    const searchText = [
      rule.title || '',
      rule.subtitle || '',
      rule.content ? rule.content.replace(/<[^>]*>/g, '') : '', // Strip HTML
      rule.tags ? rule.tags.join(' ') : ''
    ].join(' ').toLowerCase();
    
    return searchText;
  }

  // Instance methods
  Rule.prototype.incrementViewCount = async function() {
    this.view_count += 1;
    await this.save({ fields: ['view_count'] });
  };

  Rule.prototype.incrementSearchCount = async function() {
    this.search_count += 1;
    await this.save({ fields: ['search_count'] });
  };

  Rule.prototype.isExpired = function() {
    return this.expires_at && new Date() > this.expires_at;
  };

  Rule.prototype.toPublicJSON = function() {
    const rule = this.get();
    return {
      id: rule.id,
      title: rule.title,
      subtitle: rule.subtitle,
      content: rule.content,
      slug: rule.slug,
      category_id: rule.category_id,
      order_index: rule.order_index,
      is_featured: rule.is_featured,
      view_count: rule.view_count,
      version: rule.version,
      tags: rule.tags,
      meta_data: rule.meta_data,
      punishment_info: rule.punishment_info,
      published_at: rule.published_at,
      expires_at: rule.expires_at,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    };
  };

  // Class methods
  Rule.findPublished = function(options = {}) {
    return Rule.findAll({
      where: {
        is_published: true,
        expires_at: {
          [sequelize.Sequelize.Op.or]: [
            null,
            { [sequelize.Sequelize.Op.gt]: new Date() }
          ]
        }
      },
      order: [['order_index', 'ASC'], ['created_at', 'DESC']],
      ...options
    });
  };

  Rule.search = function(query, options = {}) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return Rule.findAll({
      where: {
        is_published: true,
        search_vector: {
          [sequelize.Sequelize.Op.like]: `%${searchTerms.join('%')}%`
        }
      },
      order: [
        // Prioritize exact title matches
        [sequelize.Sequelize.literal(`CASE WHEN LOWER(title) LIKE '%${query.toLowerCase()}%' THEN 0 ELSE 1 END`), 'ASC'],
        ['view_count', 'DESC'],
        ['order_index', 'ASC']
      ],
      ...options
    });
  };

  Rule.findBySlug = function(slug) {
    return Rule.findOne({
      where: { slug }
    });
  };

  Rule.findFeatured = function(options = {}) {
    return Rule.findAll({
      where: {
        is_published: true,
        is_featured: true
      },
      order: [['order_index', 'ASC']],
      ...options
    });
  };

  return Rule;
}; 