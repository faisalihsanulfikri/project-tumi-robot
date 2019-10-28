# Setup Tumi Api

#### Download Code | Clone the Repo

```
git clone {repo_name}
```

#### Install Node Modules

```
npm install
```

#### Create .env File

You will find a example.env file in the home directory. Paste the contents of that into a file named .env in the same directory.
Fill in the variables to fit your application

```
APP=dev
PORT=3000

DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=robotumi
DB_USER=root
DB_PASSWORD=

JWT_ENCRYPTION=PleaseChange
JWT_EXPIRATION=10000

MAIL_GUN_API_KEY = key-16ee2b921cf3dd09a660928479d6465c
MAIL_GUN_DOMAIN = webhade.com
MAIL_GUN_MAIL = admin@robottradingsaham.com

DEFAULT_PASS_USER_TUMI=8888
```

#### Migrate Database

```
npx sequelize-cli db:migrate
```

#### Seeder Database

```
npx sequelize-cli db:seed:all
```

#### Run The Api

- For development

```
npm run serve
```

- For Production

```
npm run start
```

#### Done

## Sequelize Notes

### Sequelize Migration Example

- Create Migration

```
npx sequelize-cli model:generate --name master_setting.model --attributes config_name:string,config_value:string
```

### Sequelize Seeder Example

- Create Seeder

```
npx sequelize-cli seed:generate --name demo-user

```

- Run Seeder

```
npx sequelize-cli db:seed:all
```
