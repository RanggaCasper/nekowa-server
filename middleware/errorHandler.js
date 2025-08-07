const errorHandler = (error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Default error response
    let status = 500;
    let message = 'Internal server error';
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation error';
    } else if (error.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized';
    } else if (error.message) {
        message = error.message;
    }
    
    res.status(status).json({
        error: true,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

module.exports = errorHandler;
