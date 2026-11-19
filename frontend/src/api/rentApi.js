import axios from './axios'; // Assuming you have a configured axios instance

export const getRents = async (params) => {
  try {
    const { data } = await axios.get('/rent', { params });
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const addRent = async (rentData) => {
  try {
    const { data } = await axios.post('/rent', rentData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const updateRent = async (id, rentData) => {
  try {
    const { data } = await axios.put(`/rent/${id}`, rentData);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};

export const deleteRent = async (id) => {
  try {
    const { data } = await axios.delete(`/rent/${id}`);
    return data;
  } catch (error) {
    throw error.response?.data?.message || error.message;
  }
};