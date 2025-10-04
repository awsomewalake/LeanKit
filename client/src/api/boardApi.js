import axiosClient from './axiosClient'

const boardApi = {
  create: () => axiosClient.post('boards'),
  getAll: () => axiosClient.get('boards'),
  updatePositoin: (params) => axiosClient.put('boards', params),
  getOne: (id) => axiosClient.get(`boards/${id}`),
  delete: (id) => axiosClient.delete(`boards/${id}`),
  update: (id, params) => axiosClient.put(`boards/${id}`, params),
  getFavourites: () => axiosClient.get('boards/favourites'),
  updateFavouritePosition: (params) => axiosClient.put('boards/favourites', params),

  createShared: () => axiosClient.post('shared'),
  getAllShared: () => axiosClient.get('shared'),
  updatePositoinShared: (params) => axiosClient.put('shared', params),
  getOneShared: (id) => axiosClient.get(`shared/${id}`),
  deleteShared: (id) => axiosClient.delete(`shared/${id}`),
  updateShared: (id, params) => axiosClient.put(`shared/${id}`, params),
  getFavouritesShared: () => axiosClient.get('shared/favourites'),
  updateFavouritePositionShared: (params) => axiosClient.put('shared/favourites', params),

  addSharedUser:(id,params)=>axiosClient.put(`shared/addSharedUser/${id}`,params)
}

export default boardApi