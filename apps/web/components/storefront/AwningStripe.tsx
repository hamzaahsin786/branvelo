/** Kababjees-style red/white awning — reskinned to the tenant brand color. */
export function AwningStripe() {
  return (
    <div aria-hidden className="sticky top-0 z-50">
      <div className="awning-stripes h-3" />
      <div className="awning-scallop" />
    </div>
  );
}
