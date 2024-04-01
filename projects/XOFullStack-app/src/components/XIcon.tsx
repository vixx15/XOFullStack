import 'react'

export const XIcon = () => {
  return (
    <div className="relative h-16 w-16 cursor-pointer">
      <div className="absolute origin-top-left rotate-45 ml-8 bg-[#30c4bd] h-4 w-20 rounded-l-full rounded-r-full"></div>
      <div className="absolute origin-top-right -rotate-45 mr-2 bg-[#30c4bd] h-4 w-20 rounded-l-full rounded-r-full"></div>
    </div>
  )
}
