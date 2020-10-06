class Paginator {
  constructor (currentPage, perPage, totalCount) {
    this.currentPage = +currentPage
    this.perPage = +perPage
    this.totalCount = +totalCount
  }

  offset () {
    // Assuming 20 items per page:
    // page 1 has an offset of 0    (1-1) * 20
    // page 2 has an offset of 20   (2-1) * 20
    //   in other words, page 2 starts with item 21
    return (this.currentPage - 1) * this.perPage
  }

  totalPages () {
    return Math.ceil(this.totalCount / this.perPage)
  }

  previousPage () {
    return this.currentPage - 1
  }

  nextPage () {
    return this.currentPage + 1
  }

  hasPreviousPage () {
    return this.previousPage() >= 1
  }

  hasNextPage () {
    return this.nextPage() <= this.totalPages()
  }
}

module.exports = { Paginator }
