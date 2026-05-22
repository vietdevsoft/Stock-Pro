// =============================
// FILE: validation.js
// Mục đích: Kiểm tra dữ liệu nhập từ form trước khi gửi lên API.
// =============================

function setFieldError(fieldId, message) {
  const errorElement = qs(fieldId + 'Error');

  if (errorElement) {
    errorElement.innerText = message || '';
  }
}

function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function clearProductFormErrors() {
  const fieldIds = ['code', 'name', 'categoryId', 'quantity', 'unit', 'price', 'minStock'];

  for (let i = 0; i < fieldIds.length; i++) {
    setFieldError(fieldIds[i], '');
  }
}

function validateProductCode(code) {
  return /^SP\d{3,}$/i.test(code);
}

function validateProductForm(form) {
  let isValid = true;

  const code = form.code.value.trim();
  const name = form.name.value.trim();
  const categoryId = form.categoryId.value;
  const quantity = Number(form.quantity.value);
  const unit = form.unit.value;
  const price = Number(form.price.value);
  const minStock = Number(form.minStock.value);

  clearProductFormErrors();

  if (!validateProductCode(code)) {
    setFieldError('code', 'Mã hàng phải có dạng SP001, SP002...');
    isValid = false;
  }

  if (name.length < 3) {
    setFieldError('name', 'Tên hàng phải từ 3 ký tự.');
    isValid = false;
  }

  if (!required(categoryId)) {
    setFieldError('categoryId', 'Vui lòng chọn nhóm hàng.');
    isValid = false;
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    setFieldError('quantity', 'Số lượng phải là số nguyên >= 0.');
    isValid = false;
  }

  if (!required(unit)) {
    setFieldError('unit', 'Vui lòng nhập đơn vị.');
    isValid = false;
  }

  if (isNaN(price) || price <= 0) {
    setFieldError('price', 'Giá tiền phải lớn hơn 0.');
    isValid = false;
  }

  if (!Number.isInteger(minStock) || minStock < 0) {
    setFieldError('minStock', 'Tồn tối thiểu phải là số nguyên >= 0.');
    isValid = false;
  }

  return isValid;
}

function validateStockForm(form) {
  let isValid = true;

  const productId = form.productId.value;
  const quantity = Number(form.quantity.value);

  setFieldError('stockProductId', '');
  setFieldError('stockQuantity', '');

  if (!required(productId)) {
    setFieldError('stockProductId', 'Vui lòng chọn hàng hóa.');
    isValid = false;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setFieldError('stockQuantity', 'Số lượng phải là số nguyên > 0.');
    isValid = false;
  }

  return isValid;
}
