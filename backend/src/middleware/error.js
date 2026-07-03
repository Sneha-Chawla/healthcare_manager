function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.code === "P2002") {
    return res.status(409).json({ message: "This record already exists or slot is already booked" });
  }

  const status = error.status || 500;
  const message = error.message || "Something went wrong";
  res.status(status).json({ message });
}

module.exports = errorHandler;
