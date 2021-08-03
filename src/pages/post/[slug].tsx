import { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';

import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { Fragment } from 'react';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const contentWords = post.data.content?.reduce((contents, content) => {
    let newContents = contents;
    const whiteSpacesRegex = /\s/g;

    const bodyWords =
      RichText.asText(content.body)?.match(whiteSpacesRegex)?.length + 1;
    const hWords = content.heading?.match(whiteSpacesRegex)?.length + 1;

    newContents += contents + hWords + bodyWords;
    return newContents;
  }, 0);

  const readingTime = `${Math.ceil(contentWords / 200)} min`;

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <main className={styles.container}>
      <h1>{post.data.title}</h1>
      <Image src={post.data.banner.url} alt="" width={1440} height={300} />

      <div>
        {post.first_publication_date ? (
          <span>
            <FiCalendar size={20} color="white" />
            {format(
              new Date(post.first_publication_date),
              'dd MMM yyyy'
            ).toLowerCase()}
          </span>
        ) : null}
        <span>
          <FiUser size={20} color="white" />
          {post.data.author}
        </span>
        <span>
          <FiClock size={20} color="white" />
          {readingTime}
        </span>
      </div>
      {post.data.content?.map(c => (
        <Fragment key={c.heading}>
          <h1>{c.heading}</h1>
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: RichText.asHtml(c.body) as unknown as string,
            }}
          />
        </Fragment>
      ))}
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post'),
  ]);

  const postPaths = posts.results.map(result => ({
    params: {
      slug: result.uid,
    },
  }));

  return {
    fallback: 'blocking',
    paths: postPaths,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;

  try {
    const response = await prismic.getByUID('post', String(slug), {});

    if (!response?.data) {
      throw new Error('Something went wrong');
    }

    const post = {
      data: {
        author: response.data.author,
        banner: {
          url: response.data.banner.url,
        },
        content: response.data.content,
        title: response.data.title,
        subtitle: response.data.subtitle,
      },
      first_publication_date: response.first_publication_date,
      uid: response.uid,
    };

    return {
      props: {
        post,
      },
      revalidate: 60 * 60 * 24, // 24 hours
    };
  } catch (e) {
    return {
      props: {},
      notFound: true,
    };
  }
};
