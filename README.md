# IMEditor

![Version](https://s3.eu-west-2.amazonaws.com/endeavour-codebuild-output/badges/IMEditor/version.svg)
![Build Status](https://s3.eu-west-2.amazonaws.com/endeavour-codebuild-output/badges/IMEditor/build.svg)
![Unit Tests](https://s3.eu-west-2.amazonaws.com/endeavour-codebuild-output/badges/IMEditor/unit-test.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=endeavourhealth-discovery_IMEditor&metric=alert_status)](https://sonarcloud.io/dashboard?id=endeavourhealth-discovery_IMEditor)

## Project setup

**The proxy expects the API to be running on localhost:8080**

```
npm install
```

#### Environment variables

In project root add files

> .env.development.local

> .env.production.local

> .env.test.local

Files should contain:

    VITE_API={url for IMApi} [local default: http://localhost:8080/]

    VITE_DIRECTORY_URL={url for IMDirectory} [local default: http://localhost:8082]

    VITE_EDITOR_URL={url for IMEditor} [local default: http://localhost:8082]

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
