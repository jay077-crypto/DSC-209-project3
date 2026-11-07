
const BRAND_COLORS = d3.scaleOrdinal()
  .domain([
    "Mcdonalds", "Chick-fil-A", "Sonic", "Arbys", 
    "Burger King", "Dairy Queen", "Subway", "Taco Bell"
  ])
  .range(d3.schemeTableau10);

d3.csv("fastfood.csv").then(raw => {
  const data = raw.map(d => {
    const calories = +d.calories;
    const protein = +d.protein;
    const total_carb = +d.total_carb || 0;
    const total_fat = +d.total_fat || 0;
    const sodium = +d.sodium || 0;

    const protein_density = calories > 0 ? (protein / calories) * 100 : 0;
    const sodium_density = calories > 0 ? (sodium / calories) * 100 : 0;
    const macro_kcal = (protein * 4) + (total_carb * 4) + (total_fat * 9);

    let cal_tier = ">900";
    if (calories < 300) cal_tier = "<300";
    else if (calories <= 600) cal_tier = "300-600";
    else if (calories <= 900) cal_tier = "600-900";

    let brand = d.restaurant ? d.restaurant.trim() : "";
    if (brand === "Chick Fil-A") {
    brand = "Chick-fil-A";
    }
    return {
      restaurant: brand,
      item: d.item,
      calories,
      protein,
      total_carb,
      total_fat,
      sodium,
      protein_density,
      sodium_density,
      macro_kcal,
      cal_tier
    };
  }).filter(d => !isNaN(d.calories) && !isNaN(d.protein) && d.calories > 0 && (d.protein * 4 <= d.calories));

  drawGraph1(data);
  drawGraph2(data);
  drawGraph3(data);
  drawGraph4(data);
  drawGraph5(data);
  drawGraph6(data);
});

function drawGraph1(data) {
  const container = d3.select("#graph1");
  let selectedRestaurant = null;
  container.append("h3").text("Graph 1: Calories vs. Protein Overview");
  container.append("div").attr("id", "tooltip");

  const width = 500, height = 300;
  const margin = { top: 20, right: 110, bottom: 40, left: 50 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.calories) * 1.05])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.protein) * 1.05])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5));

  const dots = svg.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.calories))
    .attr("cy", d => y(d.protein))
    .attr("r", 3.5)
    .attr("fill", d => BRAND_COLORS(d.restaurant))
    .attr("opacity", 0.7)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", 6)
        .attr("opacity", 1);
      d3.select("#tooltip")
        .style("visibility", "visible")
        .text(`${d.restaurant} | ${d.item} | ` +
        `${d.calories} calories | ` +
        `${d.protein}g protein | ` +
        `${d.protein_density.toFixed(2)}g/100 kcal`
      );
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", 3.5)
        .attr("opacity", 0.7);
      d3.select("#tooltip")
        .style("visibility", "hidden");
    })

  svg.append("text").attr("x", (width - margin.right + margin.left) / 2).attr("y", height - 5)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Calories (kcal)");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(height / 2)).attr("y", 15)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Protein (g)");

  const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);
  BRAND_COLORS.domain().forEach((b, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 13})`).style("cursor", "pointer")
      .on("click", function() {
        if (selectedRestaurant === b) {
          selectedRestaurant = null;
        } else {
          selectedRestaurant = b;
        }
        dots.attr("display", d => (selectedRestaurant === null || d.restaurant === selectedRestaurant) ? null : "none");
        legend.selectAll("text").attr("font-weight", function() {
          const restaurant = d3.select(this).text();
          return restaurant === selectedRestaurant ? "bold" : "normal";
        });
      });
    row.append("circle").attr("r", 3.5).attr("fill", BRAND_COLORS(b));
    row.append("text").attr("x", 8).attr("y", 3.5).attr("font-size", "8.5px").text(b);
  });
}

function drawGraph2(data) {
  const container = d3.select("#graph2");
  container.html(""); // 每次绘制前清空容器，彻底防止重复叠加
  container.append("h3").text("Graph 2: Top 10 Protein-Dense Items (per 100 kcal)");
  container.append("div").attr("id", "tooltip2").text("Hover over a bar to view nutritional information");

 // 1. Filter out invalid data due to data entry errors (protein calories cannot exceed total calories).
  const validData = data.filter(d => (d.protein * 4) <= d.calories);

  
  const top10 = [...validData].sort((a, b) => b.protein_density - a.protein_density).slice(0, 10);

  const width = 520, height = 300;
  const margin = { top: 20, right: 120, bottom: 40, left: 205 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const y = d3.scaleBand()
    .domain(top10.map(d => d.item))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(top10, d => d.protein_density) * 1.15])
    .range([margin.left, width - margin.right]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSize(0))
    .selectAll("text").attr("font-size", "8px");

  svg.selectAll("rect")
    .data(top10)
    .join("rect")
    .attr("y", (d, i) => y(y.domain()[i]))
    .attr("x", margin.left)
    .attr("height", y.bandwidth())
    .attr("width", d => Math.max(0, x(d.protein_density) - margin.left))
    .attr("fill", d => BRAND_COLORS(d.restaurant))
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("opacity", 0.7);
      d3.select("#tooltip2")
        .style("visibility", "visible")
        .text(`${d.restaurant} | ` +
        `${d.calories} calories | ` +
        `${d.protein}g protein | ` +
        `${d.protein_density.toFixed(2)}g/100 kcal`
      );
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("opacity", 1);
      d3.select("#tooltip2")
        .text("Hover over a bar to view nutritional information");
    });

  svg.selectAll(".bar-label")
    .data(top10)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.protein_density) + 4)
    .attr("y", (d, i) => y(y.domain()[i]) + y.bandwidth() / 2 + 3)
    .attr("font-size", "7.5px")
    .attr("fill", "#444")
    .text(d => `${d.protein_density.toFixed(1)}g `);

  svg.append("text").attr("x", (width - margin.right + margin.left) / 2).attr("y", height - 5)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Protein Density (g per 100 kcal)");
}
function drawGraph3(data) {
  const container = d3.select("#graph3");
  container.append("h3").text("Graph 3: Protein Density Distribution Across Chains");
  container.append("div").attr("id", "tooltip3").text("Hover over a dot or box to view protein nutritional information");

  const width = 500, height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const brands = BRAND_COLORS.domain();

  const x = d3.scaleBand()
    .domain(brands)
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.protein_density) * 1.05])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .attr("text-anchor", "end")
    .attr("font-size", "8.5px");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5));

  brands.forEach(brand => {
    const brandData = data.filter(d => d.restaurant === brand).map(d => d.protein_density).sort(d3.ascending);
    if (brandData.length === 0) return;

    const q1 = d3.quantile(brandData, 0.25);
    const median = d3.quantile(brandData, 0.5);
    const q3 = d3.quantile(brandData, 0.75);
    const min = d3.min(brandData);
    const max = d3.max(brandData);
    const center = x(brand) + x.bandwidth() / 2;

    svg.append("line").attr("x1", center).attr("x2", center).attr("y1", y(min)).attr("y2", y(max)).attr("stroke", "#888");

    svg.append("rect")
      .attr("x", x(brand))
      .attr("y", y(q3))
      .attr("width", x.bandwidth())
      .attr("height", Math.max(0, y(q1) - y(q3)))
      .attr("fill", BRAND_COLORS(brand))
      .attr("opacity", 0.3)
      .attr("stroke", BRAND_COLORS(brand))
      .style("cursor", "pointer")
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 0.6);
        d3.select("#tooltip3")
          .text(
          `Min: ${min.toFixed(2)}g | Q1: ${q1.toFixed(2)}g | Median: ${median.toFixed(2)}g | Q3: ${q3.toFixed(2)}g | Max: ${max.toFixed(2)}g`
        );
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.3);
        d3.select("#tooltip3")
          .text("Hover over a dot or box to view protein nutritional information");
      });

    svg.append("line")
      .attr("x1", x(brand)).attr("x2", x(brand) + x.bandwidth())
      .attr("y1", y(median)).attr("y2", y(median))
      .attr("stroke", "#222").attr("stroke-width", 1.5);
  });

  svg.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.restaurant) + x.bandwidth() / 2 + (Math.random() - 0.5) * (x.bandwidth() * 0.8))
    .attr("cy", d => y(d.protein_density))
    .attr("r", 2)
    .attr("fill", d => BRAND_COLORS(d.restaurant))
    .attr("opacity", 0.6)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", 4)
        .attr("opacity", 1);
      d3.select("#tooltip3")
        .text(`${d.item} | ` +
        `${d.protein_density.toFixed(2)}g/100 kcal`
      );
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", 2)
        .attr("opacity", 0.6);
      d3.select("#tooltip3")
        .text("Hover over a dot or box to view protein nutritional information");
    });

  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(height / 2)).attr("y", 15)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Protein (g / 100 kcal)");
}

function drawGraph4(data) {
  const container = d3.select("#graph4");
  container.html(""); // Clear the container before drawing
  container.append("h3").text("Graph 4: Avg Protein (g) by Brand and Calorie Tier");

  const filter = container.append("select").attr("id", "tierFilter");
  filter.selectAll("option")
    .data(["All Tiers", "<300", "300-600", "600-900", ">900"])
    .join("option")
    .attr("value", d => d)
    .text(d => d === "All Tiers" ? d : `${d} kcal`);

  const width = 500, height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 90 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const tiers = ["<300", "300-600", "600-900", ">900"];
  const brands = BRAND_COLORS.domain();

  const gridData = [];
  brands.forEach(brand => {
    tiers.forEach(tier => {
      const items = data.filter(d => d.restaurant === brand && d.cal_tier === tier);
      const avg = items.length > 0 ? d3.mean(items, d => d.protein) : null;
      gridData.push({ brand, tier, avg });
    });
  });

  const x = d3.scaleBand().domain(tiers).range([margin.left, width - margin.right]).padding(0.08);
  const y = d3.scaleBand().domain(brands).range([margin.top, height - margin.bottom]).padding(0.08);

  const maxVal = d3.max(gridData, d => d.avg || 0);
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

  const xAxis = svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height - margin.bottom})`);
  const yAxis = svg.append("g").attr("class", "y-axis").attr("transform", `translate(${margin.left},0)`);

  function updateGraph4(selectedTier) {
    const filteredData = selectedTier === "All Tiers" ? gridData : gridData.filter(d => d.tier === selectedTier);
    const visiibleTiers = selectedTier === "All Tiers" ? tiers : [selectedTier];
    const rankedBrands = [...brands];
    if (selectedTier !== "All Tiers") {
      rankedBrands.sort((a, b) => {
        const avgA = filteredData.find(d => d.brand === a)?.avg ?? -1;
        const avgB = filteredData.find(d => d.brand === b)?.avg ?? -1;
        return avgB - avgA;
      });
  }

  x.domain(visiibleTiers);
  y.domain(rankedBrands);

  xAxis.call(d3.axisBottom(x));
  yAxis.call(d3.axisLeft(y).tickSize(0)).selectAll("text").attr("font-size", "8.5px");

  svg.selectAll(".heatmap-cell")
    .data(filteredData, d => `${d.brand}-${d.tier}`)
    .join("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => x(d.tier))
    .attr("y", d => y(d.brand))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => d.avg !== null ? color(d.avg) : "#f0f0f0")
    .attr("rx", 3);

  svg.selectAll(".cell-text")
    .data(filteredData, d => `${d.brand}-${d.tier}`)
    .join("text")
    .attr("class", "cell-text")
    .attr("x", d => x(d.tier) + x.bandwidth() / 2)
    .attr("y", d => y(d.brand) + y.bandwidth() / 2 + 3.5)
    .attr("text-anchor", "middle")
    .attr("font-size", "8px")
    .attr("fill", d => (d.avg && d.avg > maxVal * 0.55) ? "#fff" : "#222")
    .style("pointer-events", "none")
    .text(d => d.avg !== null ? `${d.avg.toFixed(1)}g` : "—");

}
  filter.on("change", function() {
    updateGraph4(this.value);
  });

  updateGraph4("All Tiers");
}

function drawGraph5(data) {
  const container = d3.select("#graph5");
  container.append("h3").text("Graph 5: Caloric Macro Composition (100% Stacked)");
  
  const width = 500, height = 280;
  const margin = { top: 20, right: 90, bottom: 50, left: 45 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const brands = BRAND_COLORS.domain();

  const brandMacros = brands.map(brand => {
    const items = data.filter(d => d.restaurant === brand);
    const avgP = d3.mean(items, d => d.protein) * 4;
    const avgC = d3.mean(items, d => d.total_carb) * 4;
    const avgF = d3.mean(items, d => d.total_fat) * 9;
    const total = avgP + avgC + avgF;
    return {
      brand,
      protein: (avgP / total) * 100,
      carb: (avgC / total) * 100,
      fat: (avgF / total) * 100
    };
  }).sort((a, b) => b.protein - a.protein);

  const stack = d3.stack().keys(["protein", "carb", "fat"]);
  const series = stack(brandMacros);

  const x = d3.scaleBand().domain(brandMacros.map(d => d.brand)).range([margin.left, width - margin.right]).padding(0.3);
  const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
  const macroColor = d3.scaleOrdinal().domain(["protein", "carb", "fat"]).range(["#2ca02c", "#1f77b4", "#ff7f0e"]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
    .selectAll("text").attr("transform", "rotate(-25)").attr("text-anchor", "end").attr("font-size", "8.5px");

  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

  svg.selectAll("g.layer")
    .data(series)
    .join("g")
    .attr("class", "layer")
    .attr("fill", d => macroColor(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.brand))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mouseover", function(event, d) {
      const layer = d3.select(this.parentNode);
      layer.selectAll(".percent-label").attr("opacity", 1);
    })
    .on("mouseout", function(event, d) {
      const layer = d3.select(this.parentNode);
      layer.selectAll(".percent-label").attr("opacity", 0);
    });
  svg.selectAll("g.layer")
    .each(function() {
      const layer = d3.select(this);
      const macro = layer.datum().key;
      layer.selectAll(".percent-label")
        .data(d => d)
        .join("text")
        .attr("class", "percent-label")
        .attr("x", d => x(d.data.brand) + x.bandwidth() / 2)
        .attr("y", d => y(d[1]) + (y(d[0]) - y(d[1])) / 2 + 3)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .attr("opacity", 0)
        .style("pointer-events", "none")
        .text(d => `${(d.data[macro]).toFixed(1)}%`);
  });

  const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);
  ["protein", "carb", "fat"].forEach((k, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 15})`);
    row.append("rect").attr("width", 8).attr("height", 8).attr("fill", macroColor(k));
    row.append("text").attr("x", 12).attr("y", 7).attr("font-size", "8.5px")
      .text(k === "protein" ? "Protein (4cal)" : k === "carb" ? "Carbs (4cal)" : "Fat (9cal)");
  });

  container.append("p")
    .style("font-size", "10px")
    .style("color", "#777")
    .style("margin-top", "2px")
    .text("* Normalized: MacroKcal = (Protein×4) + (Carbs×4) + (Fat×9). Minor differences from label calories are due to fiber and rounding.");
}

function drawGraph6(data) {
  const container = d3.select("#graph6");
  container.append("h3").text("Graph 6: The Sodium Trade-Off (Protein vs Sodium Density)");
  container.append("div").attr("id", "tooltip6").style("visibility", "hidden");

  const width = 500, height = 300;
  const margin = { top: 20, right: 110, bottom: 40, left: 50 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%").style("height", "auto");

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.protein_density) * 1.05])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.sodium_density) * 1.05])
    .range([height - margin.bottom, margin.top]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.calories)])
    .range([2, 9]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));

  const medX = d3.median(data, d => d.protein_density);
  const medY = d3.median(data, d => d.sodium_density);

  svg.append("line").attr("x1", x(medX)).attr("x2", x(medX)).attr("y1", margin.top).attr("y2", height - margin.bottom)
    .attr("stroke", "#aaa").attr("stroke-dasharray", "3,3");
  svg.append("line").attr("x1", margin.left).attr("x2", width - margin.right).attr("y1", y(medY)).attr("y2", y(medY))
    .attr("stroke", "#aaa").attr("stroke-dasharray", "3,3");

  const dots = svg.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.protein_density))
    .attr("cy", d => y(d.sodium_density))
    .attr("r", d => r(d.calories))
    .attr("fill", d => BRAND_COLORS(d.restaurant))
    .attr("opacity", 0.55)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5);
      d3.select("#tooltip6").style("visibility", "visible")
      .text(`${d.restaurant} | ${d.item} | ` +
        `${d.protein_density.toFixed(2)}g protein/100 kcal | ` +
        `${d.sodium_density.toFixed(2)}mg sodium/100 kcal`);
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("opacity", 0.55)
        .attr("stroke", "none");
      d3.select("#tooltip6")
        .style("visibility", "hidden");
    });

  svg.append("text").attr("x", (width - margin.right + margin.left) / 2).attr("y", height - 5)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Protein Density (g / 100 kcal)");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -(height / 2)).attr("y", 15)
    .attr("text-anchor", "middle").attr("font-size", "10px").text("Sodium Density (mg / 100 kcal)");
  
  let selectedRestaurant = null;

  const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);
  BRAND_COLORS.domain().forEach((b, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 13})`)
    .style("cursor", "pointer")
      .on("click", function() {
        selectedRestaurant = selectedRestaurant === b ? null : b;
        dots.attr("display", d => (selectedRestaurant === null || d.restaurant === selectedRestaurant) ? null : "none");
        legend.selectAll("text").attr("font-weight", function() {
          const restaurant = d3.select(this).text();
          return restaurant === selectedRestaurant ? "bold" : "normal";
        });
      });
    row.append("circle").attr("r", 3.5).attr("fill", BRAND_COLORS(b));
    row.append("text").attr("x", 8).attr("y", 3.5).attr("font-size", "8.5px").text(b);
  });
}