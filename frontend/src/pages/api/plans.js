// pages/api/plans.js

export default function handler(req, res) {
    const plans = [
      {
        id: 'plan1',
        name: '1 Hour Access',
        price: 10,
        duration: '1h',
        speed: '2 Mbps'
      },
      {
        id: 'plan2',
        name: '3 Hours Access',
        price: 15,
        duration: '3h',
        speed: '3 Mbps'
      },
      {
        id: 'plan3',
        name: '6 Hours Access',
        price: 20,
        duration: '6h',
        speed: '4 Mbps'
      },
      {
        id: 'plan4',
        name: '12 Hours Access',
        price: 25,
        duration: '12h',
        speed: '5 Mbps'
      },
      {
        id: 'plan5',
        name: '24 Hours Access',
        price: 30,
        duration: '24h',
        speed: '5 Mbps'
      },
      {
        id: 'plan6',
        name: '2 Days Access',
        price: 50,
        duration: '48h',
        speed: '6 Mbps'
      },
      {
        id: 'plan7',
        name: '3 Days Access',
        price: 80,
        duration: '72h',
        speed: '6 Mbps'
      },
      {
        id: 'plan8',
        name: '1 Week Access',
        price: 200,
        duration: '168h',
        speed: '6 Mbps'
      },
      {
        id: 'plan9',
        name: '2 Weeks Access',
        price: 300,
        duration: '336h',
        speed: '10 Mbps'
      },
      {
        id: 'plan10',
        name: '1 Month Access',
        price: 500,
        duration: '720h',
        speed: '10 Mbps'
      }
    ];
  
    res.status(200).json(plans);
}
