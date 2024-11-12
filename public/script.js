// get current date & time
function display_date_and_time() {
    var current_date = new Date();
    document.getElementById('date-time').innerHTML = current_date.toLocaleString();
}

// increase font size of the main content
function increase_font_size() {
    var mainContent = document.getElementById('main');
    var style = window.getComputedStyle(mainContent, null).getPropertyValue('font-size');
    var currentSize = parseFloat(style);
    mainContent.style.fontSize = (currentSize + 1) + 'px';
}

// decrease font size of the main content
function decrease_font_size() {
    var mainContent = document.getElementById('main');
    var style = window.getComputedStyle(mainContent, null).getPropertyValue('font-size');
    var currentSize = parseFloat(style);
    mainContent.style.fontSize = (currentSize - 1) + 'px';
}

// change background color of the page
function change_background_color() {
    var colors = [
        'rgb(225, 239, 248)', 
        'rgb(244, 233, 243)', 
        'rgb(222, 215, 236)', 
        'rgb(201, 197, 181)', 
        'rgb(225, 239, 248)'
    ];
    var current_color = document.body.style.backgroundColor;
    console.log(current_color)
    var index = colors.indexOf(current_color);
    var next_color = colors[(index + 1) % colors.length];
    console.log(next_color)
    document.body.style.backgroundColor = next_color;
}
