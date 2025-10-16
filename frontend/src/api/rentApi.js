import axios from './axios'; // Assuming you have a configured axios instance

export const getRents = async (params) => {
  try {
    const { data } = await axios.get('/api/rent', { params });
    return data;
  } catch (error) {
    throw error.response.data.message || error.message;
  }
};

export const addRent = async (rentData) => {
  try {
    const { data } = await axios.post('/api/rent', rentData);
    return data;
  } catch (error) {
    throw error.response.data.message || error.message;
  }
};

export const updateRent = async (id, rentData) => {
  try {
    const { data } = await axios.put(`/api/rent/${id}`, rentData);
    return data;
  } catch (error) {
    throw error.response.data.message || error.message;
  }
};

export const deleteRent = async (id) => {
  try {
    const { data } = await axios.delete(`/api/rent/${id}`);
    return data;
  } catch (error) {
    throw error.response.data.message || error.message;
  }
};