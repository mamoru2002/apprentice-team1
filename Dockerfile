FROM ruby:3.4.4

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install -y nodejs npm default-mysql-client

COPY Gemfile ./
RUN gem install bundler && bundle install

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 4567

CMD ["ruby", "app/app.rb"]