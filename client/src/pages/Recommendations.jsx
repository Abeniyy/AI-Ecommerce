export default function Recommendations() {
  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-indigo-100 text-indigo-800 p-2 rounded-full mr-2">
          ✨
        </span>
        Recommended For You
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* ProductCards will go here */}
      </div>
    </section>
  )
}