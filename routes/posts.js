var express = require('express');
var router = express.Router();

var PostModel = require('../models/posts');
var CommentModel = require('../models/comments');
var checkLogin = require('../middlewares/check').checkLogin;


// GET /posts 所有用户或者特定用户的文章页
//   eg: GET /posts?author=xxx
router.get('/', function(req, res, next) {
  var author = req.query.author;
  var page =req.query.page;

  Promise.all([
    PostModel.getTenPosts(author,page),
    PostModel.getPostsCount()
  ])
  .then(function (result) {
    var posts = result[0];
    var count = result[1];

    res.render('posts', {
      posts: posts,
      searchParam:"",
      count: Math.ceil(count/5)
    });
  })
  .catch(next);
});

router.get('/readmore', function(req, res, next) {
  var author = req.query.author;
  PostModel.getPostsByReadCount(author)
    .then(function (post_readmore) {
      res.send({post_readmore:post_readmore})
    })
    .catch(next);
});
router.get('/pagestotal', function(req, res, next) {

  PostModel.getPostsCount()
    .then(function (count) {
      res.send({count})
    })
    .catch(next);
});
//搜索内容展示
router.get('/searchParam',function(req,res,next){
  var author = req.query.author;
  var searchParam=req.query.searchParam;
  var page=req.query.page;
  Promise.all(
    [ PostModel.getPostsByParam(author,searchParam,page),
      PostModel.getPostsCountByParam(searchParam)
    ])
    .then(function (result) {
     var posts = result[0];
     var count = result[1];
     res.render('posts', {
      posts: posts,
      searchParam:searchParam,
      count: Math.ceil(count/5)
    });
    })
    .catch(next);

});
//tags展示内容
router.get('/searchParamType',function(req,res,next){
  var author = req.query.author;
  var searchParamType=req.query.searchParamType;
  var page=req.query.page;
  Promise.all(
    [ PostModel.getPostsByParamType(author,searchParamType,page),
      PostModel.getPostsCountByParamType(searchParamType)
    ])
    .then(function (result) {
     var posts = result[0];
     console.log("sssssssssssssssssss");
     console.log(result);
     var count = result[1];
     res.render('posts', {
      posts: posts,
      searchParamType:searchParamType,
      count: Math.ceil(count/5)
    });
    })
    .catch(next);

}) 

// GET /posts/create 发表文章页
router.get('/create', checkLogin, function(req, res, next) {
  res.render('create');
});

// POST /posts 发表一篇文章
router.post('/', checkLogin, function(req, res, next) {
  console.log(req.fields)
  var author = req.session.user._id;
  console.log(author);
  var title = req.fields.title;
  var content = req.fields.content;
  var icon = req.fields.icon;
  var label = req.fields.label;
  var param_type=req.fields.param_type;
  var contentintro=req.fields.contentintro;

  // 校验参数
  try {
    if (!title.length) {
      throw new Error('请填写标题');
    }
    if (!content.length) {
      throw new Error('请填写内容');
    }
  } catch (e) {
    req.flash('error', e.message);
    return res.redirect('back');
  }

  var post = {
    author: author,
    title: title,
    content: content,
    icon:icon,
    label:label,
    pv: 0,
    creat_time:new Date().Format("yyyy-MM-dd hh:mm:ss"),
    param_type:param_type,
    contentintro:contentintro
  };
 

  PostModel.create(post)
    .then(function (result) {
      // 此 post 是插入 mongodb 后的值，包含 _id
      post = result.ops[0];
      
    
      req.flash('success', '发表成功');
      // 发表成功后跳转到该文章页
      res.redirect(`/posts/${post._id}`);
    })
    .catch(next);
});

// GET /posts/:postId 单独一篇的文章页
router.get('/:postId', function(req, res, next) {
  var postId = req.params.postId;
  
  Promise.all([
    PostModel.getPostById(postId),// 获取文章信息
    CommentModel.getComments(postId),// 获取该文章所有留言
    PostModel.incPv(postId)// pv 加 1
  ])
  .then(function (result) {
    var post = result[0];
    var comments = result[1];
    if (!post) {
      throw new Error('该文章不存在');
    }

    res.render('post-detail', {
      post: post,
      comments: comments
    });
  })
  .catch(next);
});

// GET /posts/:postId/edit 更新文章页
router.get('/:postId/edit', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session.user._id;

  PostModel.getRawPostById(postId)
    .then(function (post) {
      if (!post) {
        throw new Error('该文章不存在');
      }
      if (author.toString() !== post.author._id.toString()) {
        throw new Error('权限不足');
      }
      res.render('edit', {
        post: post
      });
    })
    .catch(next);
});

// POST /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session.user._id;
  console.log(author);
  var title = req.fields.title;
  var content = req.fields.content;
  var icon = req.fields.icon;
  var label = req.fields.label;
  var param_type=req.fields.param_type;
  var contentintro=req.fields.contentintro;

  PostModel.updatePostById(postId, author, { title: title, content: content,icon:icon,label:label,param_type:param_type,contentintro:contentintro})
    .then(function () {
      req.flash('success', '编辑文章成功');
      // 编辑成功后跳转到上一页
      res.redirect(`/posts/${postId}`);
    })
    .catch(next);
});

// GET /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session.user._id;

  PostModel.delPostById(postId, author)
    .then(function () {
      req.flash('success', '删除文章成功');
      // 删除成功后跳转到主页
      res.redirect('/posts');
    })
    .catch(next);
});

// POST /posts/:postId/comment 创建一条留言
router.post('/:postId/comment', checkLogin, function(req, res, next) {
  var author = req.session.user._id;
  var postId = req.params.postId;
  var content = req.fields.content;
  var comment = {
    author: author,
    postId: postId,
    content: content
  };

  CommentModel.create(comment)
    .then(function () {
      req.flash('success', '留言成功');
      // 留言成功后跳转到上一页
      res.redirect('back');
    })
    .catch(next);
});

// GET /posts/:postId/comment/:commentId/remove 删除一条留言
router.get('/:postId/comment/:commentId/remove', checkLogin, function(req, res, next) {
  var commentId = req.params.commentId;
  var author = req.session.user._id;

  CommentModel.delCommentById(commentId, author)
    .then(function () {
      req.flash('success', '删除留言成功');
      // 删除成功后跳转到上一页
      res.redirect('back');
    })
    .catch(next);
});
Date.prototype.Format = function (fmt) { //author: meizz 
var o = {
    "M+": this.getMonth() + 1, //月份 
    "d+": this.getDate(), //日 
    "h+": this.getHours(), //小时 
    "m+": this.getMinutes(), //分 
    "s+": this.getSeconds(), //秒 
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
    "S": this.getMilliseconds() //毫秒 
};
if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
for (var k in o)
if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
return fmt;
}
module.exports = router;
