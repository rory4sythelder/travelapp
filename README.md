# Driving Routes Map

This project is a web application that allows users to create and manage driving routes with multiple waypoints. It features a map interface that overlays the routes and tracks visited counties in the United States.

## Features

- **Route Creation**: Users can enter driving routes with multiple waypoints.
- **County Tracking**: The application overlays visited counties based on the driving routes.
- **Save and Update**: Users can save their routes for future updates.

## Project Structure

```
driving-routes-map
├── client                # Client-side application
│   ├── public            # Public assets
│   ├── src               # Source code for the React application
│   ├── package.json      # Client package configuration
│   └── tsconfig.json     # TypeScript configuration for client
├── server                # Server-side application
│   ├── src               # Source code for the Express server
│   ├── package.json      # Server package configuration
│   └── tsconfig.json     # TypeScript configuration for server
├── shared                # Shared types and interfaces
├── .env.example          # Example environment variables
├── docker-compose.yml    # Docker configuration
├── package.json          # Main project package configuration
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Docker (optional, for containerized setup)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd driving-routes-map
   ```

2. Install dependencies for the client:
   ```
   cd client
   npm install
   ```

3. Install dependencies for the server:
   ```
   cd server
   npm install
   ```

### Running the Application

- To run the client application:
  ```
  cd client
  npm start
  ```

- To run the server application:
  ```
  cd server
  npm start
  ```

### Docker Setup

To run the application using Docker, use the following command:
```
docker-compose up
```

## Usage

- Navigate to the client application in your browser.
- Use the Route Editor to create and manage your driving routes.
- The map will display your routes and the counties you have visited.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.