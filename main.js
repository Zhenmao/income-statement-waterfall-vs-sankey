import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import waterfall from "./waterfall.js";
import sankey from "./sankey.js";

Promise.all([
  d3.csv("waterfall.csv", d3.autoType),
  d3.csv("sankey.csv", d3.autoType),
]).then(([waterfallData, sankeyData]) => {
  waterfall({
    svg: d3.select("#waterfall"),
    data: waterfallData,
    color: getColorScale(["Profit", "Cost", "Summary"]),
  });

  sankey({
    svg: d3.select("#sankey"),
    data: sankeyData,
    color: getColorScale(["Profit", "Cost", "Revenue"]),
  });
});

function getColorScale(domain) {
  const styles = getComputedStyle(document.documentElement);
  return d3
    .scaleOrdinal()
    .domain(domain)
    .range(
      domain.map((d) => styles.getPropertyValue(`--color-${d.toLowerCase()}`))
    );
}
