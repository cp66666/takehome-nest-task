> ### NestJS Feature Enhancement Assignment


----------

# Getting started

## Installation

Clone the repository

    git clone https://github.com/cp66666/takehome-nest-task.git

Switch to the repo folder

    cd takehome-nest-task

Install dependencies

    npm install
    
----------

## Database
##### TypeORM

Create a new mysql database with the name `nestjsrealworld`\
(or the name you specified in the ormconfig.json)

Set mysql database settings in ormconfig.json

    {
      "type": "mysql",
      "host": "localhost",
      "username": "your-mysql-username",
      "password": "your-mysql-password",
      "database": "my_nestjs_project",
      "entities": ["dist/**/*.entity.{ts,js}"],
      "synchronize": true
    }

Start local mysql server and create new database 'my_nestjs_project'

On application start, tables for all entities will be created.

----------
## NPM scripts

- `npm start` - Start application
- `npm run start:watch` - Start application in watch mode
- `npm run test` - run Jest test runner
- `npm run start:prod` - Build application

----------

## REST API
The REST APIs are described below.

----------

##### Create a new user

POST /users
Example:

    curl -X POST http://localhost:3000/users  -H "Content-Type: application/json"  -d '{"name": "user1"}' 

Explain:
The server creates a new user with an auto-generated 'id', 'name' is "user1". The events of the user is an empty array.

----------

##### Create a new event

POST /events
Example:

    curl -X POST http://localhost:3000/events -H "Content-Type: application/json"  -d '{                                 
           "title": "event1",                      
           "description": "This is event1",        
           "status": "TODO",                      
           "startTime": "2024-01-14T13:00:00.000Z", 
           "endTime": "2024-01-14T15:00:00.000Z",                                                                                         
           "invitees": [1, 2]                                                                                                                                    
         }'
Explain:
A new event is created when parameters are valid. "title", "status", "startTime" and "endTime" are required; "description" and "invitees" are optional. "status" is enum (['TODO', 'IN_PROGRESS', 'COMPLETED']. "startTime" and "endTime" must be valid date format.
    
----------

##### Retrieve an event by its id

GET /events/:id
Example:

    curl -X GET http://localhost:3000/events/1
Explain:
The server will responce the event with id 1, if it can be found in database. For example:

    {"id":1,"title":"event1","description":"This is event1","status":"TODO","createdAt":"2024-01-17T05:23:11.134Z","updatedAt":"2024-01-17T05:23:11.134Z","startTime":"2024-01-14T13:00:00.000Z","endTime":"2024-01-14T15:00:00.000Z","invitees":[{"id":1,"name":"user1"},{"id":2,"name":"user2"}]}
    
----------

##### Delete an event by its id

DELETE /events/:id
Example:

    curl -X DELETE http://localhost:3000/events/1

Explain:
The server will delete the event with id 1, if it can be found in database.

----------

##### MergeAll

POST /events/merge
Example:

    curl -X POST http://localhost:3000/events/merge 

Explain:
The server merges all overlapping events below to a user. For those event, will invite all members in each event. Overlapping example: E1: 2pm-3pm, E2: 2:45pm-4pm => E_merged: 2pm-4pm. The original events that has been merged will be deleted at the end.

----------

## Start application

- `npm run start`
- Test api with curl.


----------

## Run unit tests

- `npm run test` or `npm run test:watch`
- check the result
-
----------

## Demo video
The demo videos are attached and sent by email.

----------

## To Reviewer

Thank you for considering me for this project. However, as I am still expanding my expertise in the language and framework used, as well as managing my college coursework, there remain several aspects of the project that could be further developed, such as adding comprehensive unit and integration tests. I am committed to continuous learning and improvement, and I am confident that with time and experience, I can overcome these challenges. I am very grateful for the opportunity to contribute to this project and hope to have the good fortune of being selected for the position. Thanks again for understanding!

