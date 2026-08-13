ARG RUBY_VERSION=3.4.7
FROM ruby:$RUBY_VERSION-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libpq-dev postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV="production" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development"

WORKDIR /rails

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

EXPOSE $PORT

ENTRYPOINT ["./bin/docker-entrypoint"]
CMD ["sh", "-c", "bin/rails server -b 0.0.0.0 -p $PORT"]
