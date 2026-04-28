import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Truck,
  Shield,
  RefreshCw,
  Star,
  Zap,
  Crown,
  TrendingUp,
} from 'lucide-react'

import { AppContext } from '../App'
import ProductCard from '../components/ProductCard'

const CATEGORIES = [
  { name: 'Electronics', emoji: '🔌', color: 'from-blue-500 to-indigo-600', count: '50+ items' },
  { name: 'Clothing', emoji: '👔', color: 'from-pink-500 to-rose-600', count: '30+ items' },
  { name: 'Accessories', emoji: '💎', color: 'from-amber-500 to-orange-600', count: '25+ items' },
  { name: 'Food & Drinks', emoji: '🍕', color: 'from-green-500 to-emerald-600', count: '20+ items' },
  { name: 'Sports', emoji: '⚽', color: 'from-purple-500 to-violet-600', count: '15+ items' },
  { name: 'Home & Living', emoji: '🏠', color: 'from-teal-500 to-cyan-600', count: '20+ items' },
]

const STATS = [
  { value: '10K+', label: 'Happy Customers' },
  { value: '500+', label: 'Premium Products' },
  { value: '99%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'Support Available' },
]

export default function HomePage() {
  const { api } = useContext(AppContext)

  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products')
        setFeatured((res.data || []).slice(0, 8))
      } catch {
        setFeatured([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [api])

  const features = [
    {
      icon: Truck,
      title: 'Free Shipping',
      desc: 'On orders over $50',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      desc: '100% protected checkout',
      color: 'text-green-600 bg-green-50',
    },
    {
      icon: RefreshCw,
      title: 'Easy Returns',
      desc: '30-day return policy',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      icon: Sparkles,
      title: 'Best Quality',
      desc: 'Curated premium products',
      color: 'text-purple-600 bg-purple-50',
    },
  ]

  return (
    <div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 opacity-90" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 text-center">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
            <span className="animate-pulse">🚀</span>

            <span className="text-sm font-semibold">
              CI/CD Pipeline Successfully Deployed
            </span>
          </div>

          <h1 className="text-6xl lg:text-8xl font-extrabold leading-tight">
            Sahil&apos;s

            <span className="block bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Kubernetes Store
            </span>
          </h1>

          <p className="mt-8 text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Live deployment powered by React, Golang, Docker,
            Kubernetes, Helm, Traefik, GitHub Actions, and AWS EKS.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <div className="px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
              ⚡ Auto Build
            </div>

            <div className="px-6 py-3 rounded-xl bg-purple-500/20 border border-purple-400/30">
              🔄 Auto Deploy
            </div>

            <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-400/30">
              ☁ AWS EKS Live
            </div>

          </div>

          <div className="mt-14">
            <Link
              to="/products"
              className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition"
            >
              Explore Store
              <ArrowRight size={20} />
            </Link>
          </div>

        </div>
      </section>

      {/* Features Strip */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

            {features.map((f, i) => (
              <div key={i} className="flex items-center space-x-3 group">

                <div
                  className={`p-3 rounded-xl ${f.color} transition-transform group-hover:scale-110`}
                >
                  <f.icon size={20} />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {f.title}
                  </h3>

                  <p className="text-xs text-gray-500 mt-0.5">
                    {f.desc}
                  </p>
                </div>

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="text-center mb-10">
          <span className="text-primary-600 font-bold text-sm uppercase tracking-wider">
            Browse by Category
          </span>

          <h2 className="font-display text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Shop by Category
          </h2>

          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Find exactly what you are looking for in our diverse collection
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to="/products"
              className="group text-center"
            >

              <div
                className={`w-full aspect-square bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center mb-3 shadow-lg`}
              >
                <span className="text-4xl lg:text-5xl">
                  {cat.emoji}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 text-sm">
                {cat.name}
              </h3>

              <p className="text-xs text-gray-400 mt-0.5">
                {cat.count}
              </p>

            </Link>
          ))}

        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50/80 py-16">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between mb-10">

            <div>

              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={18} className="text-primary-600" />

                <span className="text-primary-600 font-bold text-sm uppercase tracking-wider">
                  Trending Now
                </span>
              </div>

              <h2 className="font-display text-3xl lg:text-4xl font-bold text-gray-900">
                Featured Products
              </h2>

              <p className="text-gray-500 mt-1">
                Handpicked just for you
              </p>

            </div>

          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">
              Loading products...
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

            </div>
          )}

        </div>

      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-10">

        <div className="max-w-7xl mx-auto px-4 text-center">

          <h3 className="text-2xl font-bold mb-2">
            ShopVerse
          </h3>

          <p className="text-gray-400">
            Automated deployment pipeline powered by Kubernetes and AWS.
          </p>

          <p className="text-sm text-gray-500 mt-4">
            © 2026 ShopVerse. All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  )
}
