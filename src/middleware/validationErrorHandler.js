function errorHandler(errors) {
    if (!errors.isEmpty()) {
      const errMessages = []
      errors.array().map(err => {
        const errMsg = {}
        errMsg[err.path] = err.msg
        errMessages.push(errMsg)
      })
      // console.log(errMessages)
      return errMessages
    }
  }
  
  export default errorHandler
  