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

function getFormValue(form, fieldName) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  return field ? field.value : '';
}

function clearFieldErrors(fieldIds) {
  for (let i = 0; i < fieldIds.length; i++) {
    setFieldError(fieldIds[i], '');
  }
}

function clearProductFormErrors() {
  clearFieldErrors(['code', 'name', 'categoryId', 'quantity', 'unit', 'price', 'minStock']);
}

function validateProductCode(code) {
  return /^SP\d{3,}$/i.test(code);
}

function validateProductForm(form) {
  let isValid = true;

  const code = getFormValue(form, 'code').trim();
  const name = getFormValue(form, 'name').trim();
  const categoryId = getFormValue(form, 'categoryId');
  const quantity = Number(getFormValue(form, 'quantity'));
  const unit = getFormValue(form, 'unit');
  const price = Number(getFormValue(form, 'price'));
  const minStock = Number(getFormValue(form, 'minStock'));

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

function getStockFieldPrefix(form) {
  if (form.id === 'importForm') {
    return 'import';
  }

  if (form.id === 'exportForm') {
    return 'export';
  }

  return 'stock';
}

function validateStockForm(form) {
  let isValid = true;
  const prefix = getStockFieldPrefix(form);

  const productIdFieldId = prefix + 'ProductId';
  const quantityFieldId = prefix + 'Quantity';

  const productId = getFormValue(form, 'productId');
  const quantity = Number(getFormValue(form, 'quantity'));

  clearFieldErrors([productIdFieldId, quantityFieldId]);

  if (!required(productId)) {
    setFieldError(productIdFieldId, 'Vui lòng chọn hàng hóa.');
    isValid = false;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setFieldError(quantityFieldId, 'Số lượng sản phẩm phải lớn hơn 0.');
    isValid = false;
  }

  return isValid;
}

function setStockQuantityError(form, message) {
  const prefix = getStockFieldPrefix(form);
  setFieldError(prefix + 'Quantity', message);
}
