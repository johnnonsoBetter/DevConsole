import { IconProps } from "../icon";

const RaindropIcon = ({ size, className, ...props }: IconProps) => (
  
  <svg
   width={size}
    height={size}
  xmlns="http://www.w3.org/2000/svg" id="Layer_2" data-name="Layer 2" viewBox="0 0 300.28 299.3"
  className={className}
  {...props}>
  <defs>
  </defs>
  <g id="Layer_1-2" data-name="Layer 1">
    <path className="cls-1" d="M274.76,252.67c-39.09,47.22-157.87,51.73-185.9,43.07,0,0,49.66-15.65,79.63-96.04,37.75-101.24,173.66-28.43,106.27,52.97ZM103.81,152.2C49.19,86.04,60.46,35.21,60.46,35.21,38.94,55.16-16.55,160.27,4.8,217.74c36.8,99.06,167.81,17.77,99.01-65.54ZM177.29,119.93c84.61-14.23,122.99,20.94,122.99,20.94C293.77,112.26,230.48,11.66,170.03,1.41c-104.19-17.66-99.29,136.44,7.26,118.52Z"/>
  </g>
</svg>
);

export default RaindropIcon;