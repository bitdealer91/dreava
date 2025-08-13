import * as React from "react";

const BannerSvg = ({ onClick, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1298 321"
    className="w-full h-full select-none"
    {...props}
  >
    {/* Фон баннера */}
    <path
      fill="#18181B"
      stroke="#fff"
      strokeWidth="0.21"
      d="M3700.67 5315.2c0-4.89-9.98-8.86-22.27-8.86H2427.64c-12.29 0-22.27 3.97-22.27 8.86v108.87c0 4.89 9.98 8.86 22.27 8.86H3678.4c12.29 0 22.27-3.97 22.27-8.86z"
      transform="matrix(1 0 0 2.51285 -2404.344 -13332.957)"
    />

    {/* Кликабельная кнопка */}
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Градиентная подложка */}
      <path
        fill="url(#_Linear1)"
        d="M1151.78 37.052c0-7.517-22.03-13.619-49.17-13.619H315.136c-27.134 0-49.164 6.102-49.164 13.619v27.237c0 7.517 22.03 13.619 49.164 13.619h787.474c27.14 0 49.17-6.102 49.17-13.619z"
        transform="matrix(.19462 0 0 .7026 509.37 217.825)"
      />

      {/* Иконка загрузки */}
      <path
        fill="#fff"
        d="M580.64 243.342c0 .614.012 12.652.012 13.856 0 .695.56 1.256 1.25 1.256s1.249-.56 1.249-1.256l-.011-13.856a1.25 1.25 0 0 0-2.5 0
           M571.246 255.048l.011 8.38c0 .69.56 1.252 1.25 1.252s1.249-.561 1.249-1.253l-.011-8.379c0-.692-.56-1.252-1.25-1.252s-1.25.56-1.25 1.252
           M589.813 255.048c0 .371.012 7.651.012 8.38 0 .69.559 1.252 1.25 1.252.69 0 1.249-.561 1.249-1.253 0-.728-.012-8.008-.012-8.379 0-.692-.559-1.252-1.25-1.252-.69 0-1.249.56-1.249 1.252"
      />
      <path
        fill="#fff"
        d="m591.037 262.378-18.422.011a1.249 1.249 0 1 0 0 2.5c1.6 0 17.607-.012 18.422-.012a1.249 1.249 0 1 0 0-2.499
           M581.062 243.84c.576.577 5.494 5.179 5.72 5.396.491.485 1.285.471 1.77-.02a1.253 1.253 0 0 0-.028-1.771c-.218-.211-5.115-4.792-5.684-5.361a1.24 1.24 0 0 0-1.764-.007 1.245 1.245 0 0 0-.014 1.763"
      />
      <path
        fill="#fff"
        d="M581.026 242.084c-.57.569-5.466 5.15-5.684 5.36a1.253 1.253 0 0 0-.028 1.771 1.253 1.253 0 0 0 1.77.021c.225-.217 5.143-4.82 5.72-5.396a1.245 1.245 0 0 0-.015-1.763 1.24 1.24 0 0 0-1.763.007"
      />

      {/* Текст Upload image */}
      <text
        x="89.146"
        y="37.587"
        fill="#fff"
        fontFamily="'MalgunGothicBold', 'Malgun Gothic', sans-serif"
        fontSize="20.831"
        fontWeight="700"
        transform="matrix(.87238 0 0 .87238 523.736 227.42)"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        Uplo
        <tspan x="135.802px 147.113px" y="37.587px 37.587px">ad</tspan> image
      </text>
    </g>

    {/* Остальной текст */}
    <text
      x="89.146"
      y="37.587"
      fill="url(#_Linear2)"
      fontFamily="'MalgunGothicBold', 'Malgun Gothic', sans-serif"
      fontSize="17.828"
      fontWeight="700"
      transform="translate(-21.81 6.162)scale(2.16747)"
    >
      You’re reading this headline – so will everyone else!
    </text>
    <text
      x="89.146"
      y="37.587"
      fill="#fff"
      fontFamily="'MalgunGothicBold', 'Malgun Gothic', sans-serif"
      fontSize="17.828"
      fontWeight="700"
      transform="matrix(1.33415 0 0 1.33415 132.84 96.885)"
    >
      This is your one and only chance to make a dazzling first impression!
    </text>
    <text
      x="89.146"
      y="37.587"
      fill="#fff"
      fillOpacity="0.5"
      fontFamily="'MalgunGothic', 'Malgun Gothic', sans-serif"
      fontSize="9.637"
      transform="translate(186.088 127.78)scale(1.45279)"
    >
      Recommended: 1200x400px, JPG or PNG. Choose a bold, eye-catching visual that represents your story.
    </text>

    {/* Градиенты */}
    <defs>
      <linearGradient id="_Linear1" x1="0" x2="1" y1="0" y2="0" gradientTransform="matrix(885.808 0 0 54.4748 265.972 50.67)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#45B4EF" />
        <stop offset="0.5" stopColor="#572BF6" />
        <stop offset="1" stopColor="#D11399" />
      </linearGradient>
      <linearGradient id="_Linear2" x1="0" x2="1" y1="0" y2="0" gradientTransform="matrix(130.74 0 0 13.7626 89.86 30.933)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#45B4EF" />
        <stop offset="0.19" stopColor="#572BF6" />
        <stop offset="0.62" stopColor="#B01AB2" />
        <stop offset="1" stopColor="#D11399" />
      </linearGradient>
    </defs>
  </svg>
);

export default BannerSvg;
