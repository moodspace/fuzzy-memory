const genresMap = {
  'action': 'Action',
  'adventure': 'Adventure',
  'casual': 'Casual',
  'indie': 'Indie',
  'racing': 'Racing',
  'rpg': 'RPG',
  'simulation': 'Simulation',
  'sports': 'Sports',
  'strategy': 'Strategy',
  'massively multiplayer': 'Massively Multiplayer'
};
let genresSelected = [];

const pricingMap = {
  '05': ['$5 & Under', 0, 5],
  '10': ['$5 to $10', 5, 10],
  '20': ['$10 to $20', 10, 20],
  '40': ['$20 to $40', 20, 40],
  '80': ['$40 to $80', 40, 80],
  '80+': ['$80 & Above', 80, 9999],
};
let pricingSelected = [];

const yearMap = {
  '2007': 2007,
  '2008': 2008,
  '2009': 2009,
  '2010': 2010,
  '2011': 2011,
  '2012': 2012,
  '2013': 2013,
  '2014': 2014,
  '2015': 2015,
  '2016': 2016
};
let yearSelected = [];

const ratingMap = {
  '0': ['N/A', 0, 0],
  '40': ['40 & Under', 0.5, 40],
  '60': ['40 to 60', 40, 60],
  '75': ['60 to 75', 60, 75],
  '90': ['75 to 90', 75, 90],
  '90+': ['90 & Above', 90, 9999],
};
let ratingSelected = [];

const margin = { top: 50, right: 50, bottom: 10, left: 50 };
let width;
let height;

let xScale;
let yScale;

let clickedItem;

let searchSelected = [];

let bgTimer;

const svg = d3.select('#chart-container>svg')
  .attr('shape-rendering', 'geometricPrecision')
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

let globalData;

const filterData = () => {
  if (searchSelected.length > 0) {
    // in search & select mode
    return globalData.filter((d) => _.findIndex(searchSelected, {id: d.id}) > 0);
  }
  return globalData
    .filter((d) => yearSelected.length === 0 ? true : yearSelected.includes(d
      .year))
    .filter((d) => genresSelected.length === 0 ? true : _.intersection(d.genres,
      genresSelected).length > 0)
    .filter((d) => {
      let rangeInclude = false;
      ratingSelected.forEach((r) => {
        const low = ratingMap[r][1];
        const high = ratingMap[r][2];
        if (d.rating >= low && d.rating <= high) {
          rangeInclude = true;
        }
      });
      return ratingSelected.length === 0 || rangeInclude;
    })
    .filter((d) => {
      let rangeInclude = false;
      pricingSelected.forEach((p) => {
        const low = pricingMap[p][1];
        const high = pricingMap[p][2];
        if (d.price >= low && d.price <= high) {
          rangeInclude = true;
        }
      });
      return pricingSelected.length === 0 || rangeInclude;
    });
}

const showDetail = (d) => {
  $('#readme').hide();

  $('g.lines').append($(`#line-${d.id}`).addClass('active').remove());

  clearTimeout(bgTimer);
  bgTimer = setTimeout(() => {
    $('.main').parent().css('background-image', `url('${d.cover}')`);
  }, 2000);
  $('#detail-cover').attr('src', d.image).show();
  $('#detail-name').text(d.name);
  $('#detail-genres').html(d.genres.map(g =>
    `<span class="badge badge-primary m-2">${genresMap[g]}</span>`).join(
    ''));

  $('#detail-release-date').text(`Released on ${moment(d.date).format('ll')}`);

  if (d.players + d.owners !== 0) {
    $('#detail-players').text(
      `${d.players} players, ${d.owners} owners by SteamSpy`);
  } else {
    $('#detail-players').text('');
  }

  if (d.recommendation !== 0) {
    $('#detail-recommendation').text(
      `Recommended by ${d.recommendation} players`);
  } else {
    $('#detail-recommendation').text('');
  }

  if (d.price === 0) {
    $('#detail-price').text('Free');
  } else {
    $('#detail-price').html(`${d.price} <span class="h5">${d.cur}</span>`);
  }

  if (d.age > 0) {
    $('#detail-age-limit').text(`${d.age}+`)
    $('#detail-age').show();
  } else {
    $('#detail-age').hide();
  }

  $('#detail-rating-score').removeClass(
    'badge-light badge-danger badge-warning badge-success');
  if (d.rating > 0) {
    $('#detail-rating-score').text(d.rating);
    let klass = 'danger';
    if (d.rating >= 50) {
      klass = 'warning';
    }
    if (d.rating >= 75) {
      klass = 'success';
    }
    $('#detail-rating-score').addClass(`badge-${klass}`);
    $('#detail-rating').show();
  } else {
    $('#detail-rating-score').text('tbd');
    $('#detail-rating-score').addClass(`badge-light`);
    $('#detail-rating').hide();
  }

  if (d.multiplayer) {
    $('#detail-ismultiplayer').show();
  } else {
    $('#detail-ismultiplayer').hide();
  }
}

const getPath = (d, xScale, yScale) => {
  return d3.line()(_.keys(yScale).map((dim) => [xScale(dim), yScale[dim](d[
    dim])]));
}

const renderLines = (data) => {
  // Add grey background lines for context.
  svg.select('.background').selectAll("*").remove();
  svg.append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr('id', (d) => `line-${d.id}`)
    .attr("d", (d) => getPath(d, xScale, yScale))
    .on("mouseover", function(d, i) {
      showDetail(d);
    }).on("mouseout", function(d, i) {
      d3.select(this).classed('active', false);
      if (clickedItem) {
        showDetail(clickedItem);
      }
    }).on("click", function(d, i) {
      $('g.lines>path').removeClass('active');
      clickedItem = d;
      showDetail(clickedItem);
    });
}

// modified based on
// https://bl.ocks.org/jasondavies/1341281
const initiateCanvas = () => {
  const data = filterData();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;
  xScale = d3.scalePoint().range([0, width]);
  yScale = {};
  svg.selectAll("*").remove();

  // The list of dimensions
  const dims = ['rating', 'price', 'owners', 'players', 'recommendation'];
  xScale.domain(dims);
  // A different y scale for each dimension
  dims.forEach((dim) => {
    yScale[dim] = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d[dim]))
      .range([height, 0])
  });

  renderLines(data);

  // Add a group element for each dimension.
  const g = svg.selectAll(".dimension")
    .data(dims)
    .enter().append("g")
    .attr("class", "dimension")
    .attr("transform", (dim) => `translate(${xScale(dim)})`);

  // Add an axis and title.
  g.append("g")
    .attr("class", "axis")
    .each(function(dim) {
      d3.select(this).call(d3.axisLeft(yScale[dim]).ticks(20, "s"))
    })
    .append("text")
    .style("text-anchor", "middle")
    .attr("x", -15)
    .attr("y", -10)
    .text((dim) => ({
      'rating': 'Metacritic',
      'price': 'Price',
      'owners': '# Owners',
      'players': '# Players',
      'recommendation': '# Recommended'
    }[dim]));
};

const bindFilters = () => {
  $('#genre-dropdown>.dropdown-menu>form').html('');
  $('#price-dropdown>.dropdown-menu>form').html('');
  $('#year-dropdown>.dropdown-menu>form').html('');
  $('#rating-dropdown>.dropdown-menu>form').html('');

  $('#genre-dropdown>.dropdown-menu>.btn-clear').click(() => {
    genresSelected = [];
    $('#genre-dropdown>.dropdown-menu>form input[type="checkbox"]').prop(
      'checked', false);
    $('#genre-dropdown>a').removeClass('active');
    initiateCanvas();
  });

  $('#price-dropdown>.dropdown-menu>.btn-clear').click(() => {
    pricingSelected = [];
    $('#price-dropdown>.dropdown-menu>form input[type="checkbox"]').prop(
      'checked', false);
    $('#price-dropdown>a').removeClass('active');
    initiateCanvas();
  });

  $('#year-dropdown>.dropdown-menu>.btn-clear').click(() => {
    yearSelected = [];
    $('#year-dropdown>.dropdown-menu>form input[type="checkbox"]').prop(
      'checked', false);
    $('#year-dropdown>a').removeClass('active');
    initiateCanvas();
  });

  $('#rating-dropdown>.dropdown-menu>.btn-clear').click(() => {
    ratingSelected = [];
    $('#rating-dropdown>.dropdown-menu>form input[type="checkbox"]').prop(
      'checked', false);
    $('#rating-dropdown>a').removeClass('active');
    initiateCanvas();
  });

  _.each(_.sortBy(_.keys(genresMap)), (gname) => {
    const gdesc = genresMap[gname];
    const $cbox = $(
      `
      <div class="custom-control custom-checkbox">
        <input type="checkbox" class="custom-control-input">
        <label class="custom-control-label">${gdesc}</label>
      </div>`
    );
    $cbox.click(() => {
      if (genresSelected.includes(gname)) {
        // deselect
        $cbox.children('input').prop('checked', false);
        _.pull(genresSelected, gname);
      } else {
        // select
        $cbox.children('input').prop('checked', true);
        genresSelected.push(gname);
      }
      if (genresSelected.length > 0) {
        $('#genre-dropdown>a').addClass('active');
      } else {
        $('#genre-dropdown>a').removeClass('active');
      }
      initiateCanvas();
    });

    $('#genre-dropdown>.dropdown-menu>form').append($cbox);
  });

  _.each(_.sortBy(_.keys(pricingMap)), (pname) => {
    const pvec = pricingMap[pname];
    const $cbox = $(
      `
      <div class="custom-control custom-checkbox">
        <input type="checkbox" class="custom-control-input">
        <label class="custom-control-label">${pvec[0]}</label>
      </div>`
    );

    $cbox.click(() => {
      if (pricingSelected.includes(pname)) {
        // deselect
        $cbox.children('input').prop('checked', false);
        _.pull(pricingSelected, pname);
      } else {
        // select
        $cbox.children('input').prop('checked', true);
        pricingSelected.push(pname);
      }
      if (pricingSelected.length > 0) {
        $('#price-dropdown>a').addClass('active');
      } else {
        $('#price-dropdown>a').removeClass('active');
      }
      initiateCanvas();
    });
    $('#price-dropdown>.dropdown-menu>form').append($cbox);
  });

  _.each(_.sortBy(_.keys(yearMap)), (yname) => {
    const ynum = yearMap[yname];
    const $cbox = $(
      `
    <div class="custom-control custom-checkbox">
      <input type="checkbox" class="custom-control-input">
      <label class="custom-control-label">${yname}</label>
    </div>`
    );

    $cbox.click(() => {
      if (yearSelected.includes(ynum)) {
        // deselect
        $cbox.children('input').prop('checked', false);
        _.pull(yearSelected, ynum);
      } else {
        // select
        $cbox.children('input').prop('checked', true);
        yearSelected.push(ynum);
      }
      if (yearSelected.length > 0) {
        $('#year-dropdown>a').addClass('active');
      } else {
        $('#year-dropdown>a').removeClass('active');
      }
      initiateCanvas();
    });
    $('#year-dropdown>.dropdown-menu>form').append($cbox);
  });

  _.each(_.sortBy(_.keys(ratingMap)), (rname) => {
    const rvec = ratingMap[rname];
    const $cbox = $(
      `
    <div class="custom-control custom-checkbox">
      <input type="checkbox" class="custom-control-input">
      <label class="custom-control-label">${rvec[0]}</label>
    </div>`
    );

    $cbox.click(() => {
      if (ratingSelected.includes(rname)) {
        // deselect
        $cbox.children('input').prop('checked', false);
        _.pull(ratingSelected, rname);
      } else {
        // select
        $cbox.children('input').prop('checked', true);
        ratingSelected.push(rname);
      }
      if (ratingSelected.length > 0) {
        $('#rating-dropdown>a').addClass('active');
      } else {
        $('#rating-dropdown>a').removeClass('active');
      }
      initiateCanvas();
    });
    $('#rating-dropdown>.dropdown-menu>form').append($cbox);
  });
};

const getGenres = (g) => {
  const genres = [];
  if (g.GenreIsIndie === 'True') {
    genres.push('indie');
  }
  if (g.GenreIsAction === 'True') {
    genres.push('action');
  }
  if (g.GenreIsAdventure === 'True') {
    genres.push('adventure');
  }
  if (g.GenreIsCasual === 'True') {
    genres.push('casual');
  }
  if (g.GenreIsStrategy === 'True') {
    genres.push('strategy');
  }
  if (g.GenreIsRPG === 'True') {
    genres.push('rpg');
  }
  if (g.GenreIsSimulation === 'True') {
    genres.push('simulation');
  }
  if (g.GenreIsSports === 'True') {
    genres.push('sports');
  }
  if (g.GenreIsRacing === 'True') {
    genres.push('racing');
  }
  if (g.GenreIsMassivelyMultiplayer === 'True') {
    genres.push('massively multiplayer');
  }
  return genres;
}

const disableAllFilters = () => {
  yearSelected = [];
  genresSelected = [];
  ratingSelected = [];
  pricingSelected = [];
  $('.navbar-nav>li>a.dropdown-toggle').removeClass('active').addClass('disabled');
}

const enableAllFilters = () => {
  disableAllFilters();
  searchSelected = [];
  $('.search').hide();
  $('.navbar-nav>li>a.dropdown-toggle').removeClass('disabled');
}

// data copyright Craig Kelly https://data.world/craigkelly/steam-game-data
$(document).ready(() => {
  d3.csv('./steam.csv', (rawData) => {
    // clean up
    let data = rawData.map(d => ({
      id: parseInt(d.QueryID, 10),
      name: d.ResponseName,
      date: d.ReleaseDate,
      rating: parseInt(d.Metacritic, 10), // filter & var
      age: parseInt(d.RequiredAge, 10),
      multiplayer: d.CategoryMultiplayer === 'True',
      price: parseFloat(d.PriceInitial, 10), // filter & var
      image: d.HeaderImage,
      cover: d.Background,
      owners: parseInt(d.SteamSpyOwners, 10), // var
      players: parseInt(d.SteamSpyPlayersEstimate, 10), // var
      genres: getGenres(d), // filter
      year: 0, // filter
      recommendation: parseInt(d.RecommendationCount, 10), // var
      cur: d.PriceCurrency,
    }));

    // filter out invalid dates
    data = data.filter(d => d.date.match(
      /^[A-Z][a-z]{2} \d{1,2} \d{4}$/));

    // format dates
    data = data.map((d) => {
      const dDateFormatted = _.clone(d);
      dDateFormatted.date = Date.parse(d.date);
      dDateFormatted.year = new Date(Date.parse(d.date)).getFullYear();
      return dDateFormatted;
    });

    globalData = data;

    initiateCanvas();
  });

  bindFilters();

  $('#search-game').on('input', (e) => {
    const query = e.currentTarget.value.trim().toLowerCase();
    if (query.length === 0) {
      enableAllFilters();
      return;
    }

    disableAllFilters();

    const data = globalData;
    let matches = data.filter((d) => d.name.trim().toLowerCase().slice(
      0, query.length) === query);
    if (matches.length < 25) {
      matches = matches.concat(
        data.filter((d) => query.length > 2 && d.name.trim().toLowerCase()
          .includes(query))
      );
    }
    matches = _.uniqBy(matches, (d) => d.name);
    let counter = 1;
    while (matches.length < 25 && counter < 10) {
      matches = matches.concat(data.filter((d) => Levenshtein.get(d.name
        .trim().toLowerCase(), query) < counter));
      matches = _.uniqBy(matches, (d) => d.name);
      counter += 1;
    }
    matches = matches.slice(0, 25);
    $('.search-results').html('');
    matches.forEach((d) => {
      $searchResult = $(
        `
        <button type="button" class="p-0 btn btn-light m-1" style="background-image: url('${d.image}'); background-size: cover;">
          <div class="p-2" style="background-color: rgba(255, 255, 255, 0.8);">${d.name}</div>
        </button>`
      );
      $searchResult.click(() => {
        if (_.findIndex(searchSelected, {id: d.id}) >= 0) {
          _.pullAllBy(searchSelected, [{id: d.id}], 'id');
        } else {
          searchSelected.push(d);
        }
        initiateCanvas();
        clickedItem = d;
        showDetail(clickedItem);
      });
      $('.search-results').append($searchResult)
    });
    $('.search').show();
  });

  $('#clear-all').click(() => {
    enableAllFilters();
    initiateCanvas();
  });

  $('#search-results-left').click(() => {
    $('.search-results').prepend(
      $('.search-results>button:last-child').remove()
    );
  });

  $('#search-results-right').click(() => {
    $('.search-results').append(
      $('.search-results>button:first-child').remove()
    );
  });
});

$(window).resize(initiateCanvas);
