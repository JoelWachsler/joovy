# Joovy gateway

This service is responsible for merging all sub-graphql services. This allows us to control authentication at a single point (in the future if needed). It also allows us to create services extending each other. Read more about this here: [Apollo Federation](https://www.apollographql.com/docs/federation/).

All GraphQL requests should go through this service.

I also recommend using [Altair](https://altair.sirmuel.design/) when developing GraphQL services.

Remember to run `yarn rover` in this project whenever a sub-GraphQL schema is updated, otherwise we won't have a great time in production :).
