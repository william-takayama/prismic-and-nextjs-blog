import { GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Link from 'next/link';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState(postsPagination?.results);
  const [shouldFetch, setShouldFetch] = useState(
    postsPagination?.next_page != null
  );

  async function fetchMore(): Promise<void> {
    if (!shouldFetch) {
      return;
    }

    try {
      const response = await fetch(postsPagination?.next_page);
      if (!response.ok) {
        throw new Error(`An error has ocurred ${response.status}`);
      }

      const newPosts = await response.json();
      setPosts([...posts, ...newPosts?.results]);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  useEffect(() => {
    setShouldFetch(!!postsPagination?.next_page);
  }, [postsPagination?.next_page]);

  return (
    <main className={styles.container}>
      {posts?.map(post => {
        return (
          <div key={post.uid}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <h2>{post.data.title}</h2>
              </a>
            </Link>
            <p>{post.data.subtitle}</p>
            <div>
              <span>
                <FiCalendar size={20} color="white" />
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
              <span>
                <FiUser size={20} color="white" />
                {post.data.author}
              </span>
            </div>
          </div>
        );
      })}

      {shouldFetch ? (
        <button type="button" onClick={fetchMore}>
          Carregar mais posts
        </button>
      ) : null}
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  try {
    const postsResponse = await prismic.query(
      [Prismic.predicates.at('document.type', 'post')],
      {
        pageSize: 2,
        page: 1,
        orderings: '[document.first_publication_date]',
      }
    );

    const postsPagination: PostPagination = {
      next_page: postsResponse.next_page,
      results: postsResponse.results.map(post => ({
        uid: post.uid,
        first_publication_date: String(post.first_publication_date),
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author ?? '',
        },
      })),
    };

    return {
      props: {
        postsPagination,
      },
    };
  } catch (e) {
    throw new Error(e.message);
  }
};
