import * as React from "react"
import Link from "next/link"

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
}

const LinkComponent = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : Link
    return (
      <Comp ref={ref} href={props.href as string} {...props} />
    )
  }
)
LinkComponent.displayName = "Link"

export { LinkComponent as Link }
