document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:3000';
    let token = localStorage.getItem('token') || null;
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const createPostForm = document.getElementById('create-post-form');
    const loginMessage = document.getElementById('login-message');
    const userInfoDiv = document.getElementById('user-info');
    const postsContainer = document.getElementById('posts-container');
  
    // Função para carregar os posts do backend
    async function loadPosts() {
      try {
        const res = await fetch(`${backendUrl}/posts`);
        const posts = await res.json();
        renderPosts(JSON.parse(posts));
      } catch (err) {
        console.error(err);
      }
    }
  
    function renderPosts(posts) {
      postsContainer.innerHTML = '';
      // Ordena os posts: os com mais likes ficam no topo
      posts.sort((a, b) => b.likes - a.likes);
  
  
      posts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.classList.add('post');
  
        // Conteúdo do post
        const contentEl = document.createElement('p');
        contentEl.textContent = post.content;
        postEl.appendChild(contentEl);
  
        // Imagem (se houver)
        if (post.image) {
          const imgEl = document.createElement('img');
          imgEl.src = post.image;
          postEl.appendChild(imgEl);
        }
  
        // Exibe likes
        const likesEl = document.createElement('div');
        likesEl.classList.add('likes');
        likesEl.textContent = `Likes: ${post.likes}`;
        postEl.appendChild(likesEl);
  
        // Botão de like (apenas se estiver logado)
        if (token) {
          const likeButton = document.createElement('button');
          likeButton.textContent = 'Curtir';
          likeButton.addEventListener('click', async () => {
            try {
              const res = await fetch(`${backendUrl}/posts/${post.id}/like`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              const data = await res.json();
              if (res.ok) {
                likesEl.textContent = `Likes: ${post.likes}`;
                loadPosts();
              } else {
                alert(data.error);
              }
            } catch (err) {
              console.error(err);
            }
          });
          postEl.appendChild(likeButton);
        }
  
        // Container de comentários
        const commentsContainer = document.createElement('div');
        commentsContainer.classList.add('comments');
        async function dojas() {
          try {
            const res = await fetch(`${backendUrl}/posts/${post.id}/comments`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            const comments = await res.json();
            coments = JSON.parse(comments)
            coments.forEach(comment => {
              const commentEl = document.createElement('div');
              commentEl.classList.add('comment');
              commentEl.textContent = comment.comment;
              commentsContainer.appendChild(commentEl);
            });
          }catch(err){
            console.error(err);
          }
        }
        dojas()
        postEl.appendChild(commentsContainer);
  
        // Botão para alternar a exibição dos comentários
        const toggleButton = document.createElement('button');
        toggleButton.classList.add('toggle-comments');
        toggleButton.textContent = 'Ver comentários';
        toggleButton.addEventListener('click', () => {
          if (commentsContainer.style.display === 'block') {
            commentsContainer.style.display = 'none';
            toggleButton.textContent = 'Ver comentários';
          } else {
            commentsContainer.style.display = 'block';
            toggleButton.textContent = 'Ocultar comentários';
          }
        });
        postEl.appendChild(toggleButton);
  
        // Formulário para adicionar comentário (se estiver logado)
        if (token) {
          const commentForm = document.createElement('form');
          commentForm.innerHTML = `
            <input type="text" placeholder="Adicione um comentário" required>
            <button type="submit">Comentar</button>
          `;
          commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const commentInput = commentForm.querySelector('input');
            const commentText = commentInput.value;
            try {
              const res = await fetch(`${backendUrl}/posts/${post.id}/comments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ comment: commentText })
              });
              const data = await res.json();
              if (res.ok) {
                // Adiciona o novo comentário na UI
                const newCommentEl = document.createElement('div');
                newCommentEl.classList.add('comment');
                newCommentEl.textContent = commentText;
                commentsContainer.appendChild(newCommentEl);
                commentInput.value = '';
              } else {
                alert(data.error);
              }
            } catch (err) {
              console.error(err);
            }
          });
          postEl.appendChild(commentForm);
        }
  
        postsContainer.appendChild(postEl);
      });
    }
  
    // Login
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      try {
        const res = await fetch(`${backendUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          token = data.token;
          localStorage.setItem('token', token);
          loginMessage.textContent = 'Login realizado com sucesso!';
          createPostForm.style.display = 'block';
          userInfoDiv.textContent = `Logado como: ${username}`;
          loadPosts();
        } else {
          loginMessage.textContent = data.error;
        }
      } catch (err) {
        console.error(err);
        loginMessage.textContent = 'Erro durante o login.';
      }
    });
  
    // Registro
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const password = document.getElementById('register-password').value;
      try {
        const res = await fetch(`${backendUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          loginMessage.textContent = 'Cadastro realizado com sucesso! Faça login.';
        } else {
          loginMessage.textContent = data.error;
        }
      } catch (err) {
        console.error(err);
        loginMessage.textContent = 'Erro durante o cadastro.';
      }
    });
  
    // Criação de post
    createPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = document.getElementById('post-content').value;
      const image = document.getElementById('post-image').value;
      try {
        const res = await fetch(`${backendUrl}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ content, image })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById('post-content').value = '';
          document.getElementById('post-image').value = '';
          loadPosts();
        } else {
          alert(data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao criar post.');
      }
    });
  
    // Se já estiver logado (token em localStorage), atualiza UI e carrega posts
    if (token) {
      userInfoDiv.textContent = `Logado`;
      createPostForm.style.display = 'block';
      loadPosts();
    } else {
      loadPosts();
    }
  });
  