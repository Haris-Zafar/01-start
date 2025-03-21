import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loader = () => {
  return (
    <div className="d-flex justify-content-center py-3">
      <Spinner
        animation="border"
        role="status"
        style={{
          width: '2rem',
          height: '2rem',
          margin: 'auto',
          display: 'block',
        }}
      >
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
};

export default Loader;
