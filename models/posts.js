var markdown = require('markdown').markdown;
var Post = require('../lib/mongo').Post;
var CommentModel = require('./comments');

// 给 post 添加留言数 commentsCount
Post.plugin('addCommentsCount', {
  afterFind: function (posts) {
    return Promise.all(posts.map(function (post) {
      return CommentModel.getCommentsCount(post._id).then(function (commentsCount) {
        post.commentsCount = commentsCount;
        return post;
      });
    }));
  },
  afterFindOne: function (post) {
    if (post) {
      return CommentModel.getCommentsCount(post._id).then(function (count) {
        post.commentsCount = count;
        return post;
      });
    }
    return post;
  }
});
// 将 post 的 content 从 markdown 转换成 html
Post.plugin('contentToHtml', {
  afterFind: function (posts) {
    return posts.map(function (post) {
      post.preintro=post.content;
      post.content = markdown.toHTML(post.content);
      return post;
    });
  },
  afterFindOne: function (post) {
    if (post) {
      post.preintro=post.content;
      post.content = markdown.toHTML(post.content);
    }
    return post;
  }
});

module.exports = {
  // 创建一篇文章
  create: function create(post) {
    return Post.create(post).exec();
  },

  // 通过文章 id 获取一篇文章
  getPostById: function getPostById(postId) {
    return Post
      .findOne({ _id: postId })
      .populate({ path: 'author', model: 'User' })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec();
  },

  // 按创建时间降序获取所有用户文章或者某个特定用户的所有文章
  getPosts: function getPosts(author) {
    var query = {};
    if (author) {
      query.author = author;
    }
    return Post
      .find(query)
      .populate({ path: 'author', model: 'User' })
      .sort({ _id: -1 })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec();
  },
  //每页查4条数据
  getTenPosts:function getTenPosts(author,page){
       var query = {};
    if (author) {
      query.author = author;
    }
    return Post
      .find(query, {
          skip: (page - 1)*5,
          limit: 5
        })
      .populate({ path: 'author', model: 'User' })
      .sort({ creat_time:-1,_id: -1 })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec();
  },
  getPostsCount:function ggetPostsCount(author){
    return Post.count().exec();
      
  },
  getPostsByReadCount:function getPostsByReadCount(author){
    var query ={};
    if(author){
      query.author=author;
    }
    return Post
    .find(query, {
          limit: 5
        })
    .populate({ path: 'author', model: 'User' })
    .sort({ pv: -1 })
    .addCreatedAt()
    .addCommentsCount()
    .contentToHtml()
    .exec();
  },
  // 模糊查询
  getPostsByParam:function getPostsByParam(author,searchParam,page){
    var query={};
    if(author){
      query.author=author;
    }
    var pattern = new RegExp(searchParam, "i");
    return Post
      .find({"title": pattern})
      .skip((page-1)*5)
      .limit(5)
      .populate({ path: 'author', model: 'User' })
      .sort({ creat_time:-1,_id: -1 })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec();
  },
  getPostsByParamType:function getPostsByParamType(author,searchParamType,page){
    var query={};
    if(author){
      query.author=author;
    }
    var pattern = new RegExp(searchParamType, "i");
    return Post
      .find({"label": pattern})
      .skip((page-1)*5)
      .limit(5)
      .populate({ path: 'author', model: 'User' })
      .sort({ creat_time:-1,_id: -1 })
      .addCreatedAt()
      .addCommentsCount()
      .contentToHtml()
      .exec();
  },
  getPostsCountByParam:function getPostsCountByParam(searchParam){
    var pattern =new RegExp(searchParam,"i");
    return Post
     .count({"title":pattern})
     .exec();
  },
  getPostsCountByParamType:function getPostsCountByParam(searchParamType){
    var pattern =new RegExp(searchParamType,"i");
    return Post
     .count({"label":pattern})
     .exec();
  },
  // 通过文章 id 给 pv 加 1
  incPv: function incPv(postId) {
    return Post
      .update({ _id: postId }, { $inc: { pv: 1 } })
      .exec();
  },

  // 通过文章 id 获取一篇原生文章（编辑文章）
  getRawPostById: function getRawPostById(postId) {
    return Post
      .findOne({ _id: postId })
      .populate({ path: 'author', model: 'User' })
      .exec();
  },

  // 通过用户 id 和文章 id 更新一篇文章
  updatePostById: function updatePostById(postId, author, data) {
    return Post.update({ author: author, _id: postId }, { $set: data }).exec();
  },

  // 通过用户 id 和文章 id 删除一篇文章
  delPostById: function delPostById(postId, author) {
    return Post.remove({ author: author, _id: postId })
      .exec()
      .then(function (res) {
        // 文章删除后，再删除该文章下的所有留言
        if (res.result.ok && res.result.n > 0) {
          return CommentModel.delCommentsByPostId(postId);
        }
      });
  }
};
