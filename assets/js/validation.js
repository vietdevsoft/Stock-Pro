// =============================
// FILE: validation.js
// Mục đích: Kiểm tra dữ liệu form trước khi submit.
// =============================

function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function isNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0;
}

function validateProductForm(form) {
  let isValid = true;

  clearFieldErrors([
    'code',
    'name',
    'categoryId',
    'quantity',
    'unit',
    'price',
    'minStock'
  ]);

  const code = form.code.value.trim();
  const name = form.name.value.trim();
  const categoryId = form.categoryId.value;
  const quantity = form.quantity.value;
  const unit = form.unit.value.trim();
  const price = Number(form.price.value);
  const minStock = form.minStock.value;

  if (!/^SP\d{3,}$/i.test(code)) {
    setFieldError('code', 'Mã hàng phải có dạng SP001, SP002...');
    isValid = false;
  }

  if (name.length < 3) {
    setFieldError('name', 'Tên hàng phải từ 3 ký tự.');
    isValid = false;
  }

  if (!isRequired(categoryId)) {
    setFieldError('categoryId', 'Vui lòng chọn nhóm hàng.');
    isValid = false;
  }

  if (!isNonNegativeInteger(quantity)) {
    setFieldError('quantity', 'Số lượng ban đầu phải là số nguyên >= 0.');
    isValid = false;
  }

  if (!isRequired(unit)) {
    setFieldError('unit', 'Vui lòng nhập đơn vị.');
    isValid = false;
  }

  if (!Number.isFinite(price) || price <= 0) {
    setFieldError('price', 'Giá tiền phải lớn hơn 0.');
    isValid = false;
  }

  if (!isNonNegativeInteger(minStock)) {
    setFieldError('minStock', 'Tồn tối thiểu phải là số nguyên >= 0.');
    isValid = false;
  }

  return isValid;
}

function validateStockForm(form, prefix) {
  let isValid = true;

  clearFieldErrors([
    prefix + 'ProductId',
    prefix + 'Quantity'
  ]);

  if (!isRequired(form.productId.value)) {
    setFieldError(prefix + 'ProductId', 'Vui lòng chọn hàng hóa.');
    isValid = false;
  }

  if (!isPositiveInteger(form.quantity.value)) {
    setFieldError(prefix + 'Quantity', 'Số lượng phải là số nguyên > 0.');
    isValid = false;
  }

  return isValid;
}

function validateCategoryForm() {
  let isValid = true;

  $('#categoryName').removeClass('is-invalid');
  $('#categoryNameError').text('');

  const name = $('#categoryName').val().trim();

  if (name.length < 2) {
    $('#categoryName').addClass('is-invalid');
    $('#categoryNameError').text('Tên nhóm hàng phải từ 2 ký tự.');
    isValid = false;
  }

  return isValid;
}
