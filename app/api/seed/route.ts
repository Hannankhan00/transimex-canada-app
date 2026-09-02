import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();

    const hashedPassword = await hashPassword("Transimex2026!");

    // 1. Seed Super Admin
    let superAdmin = await User.findOne({ email: "admin@transimex.ca" });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: "Jean-Philippe Tremblay",
        email: "admin@transimex.ca",
        password: hashedPassword,
        companyName: "Transimex Canada HQ - Operations",
        role: "admin",
        isVerified: true,
      });
    }

    // 2. Seed Client
    let client = await User.findOne({ email: "client@transimex.ca" });
    if (!client) {
      client = await User.create({
        name: "Marc Tremblay",
        email: "client@transimex.ca",
        password: hashedPassword,
        companyName: "Laurentian Global Logistics Ltd.",
        role: "client",
        isVerified: true,
      });
    }

    // 3. Seed Initial Quotes in MongoDB
    const existingQuotesCount = await Quote.countDocuments();
    if (existingQuotesCount === 0) {
      await Quote.create([
        {
          refNumber: "QT-2026-00124",
          client: {
            name: "Marc Tremblay",
            companyName: "Laurentian Global Logistics Ltd.",
            email: "dispatch@laurentianglobal.ca",
            phone: "+1 (514) 555-0199",
          },
          route: {
            origin: "Montreal (QC)",
            originDetail: "4850 Rue Saint-Patrick, Montreal, QC H4E 4N4",
            destination: "Detroit (MI)",
            destinationDetail: "8900 East Jefferson Ave, Detroit, MI 48214",
          },
          cargo: {
            transportMode: "Refrigerated Reefer",
            equipment: "53' Temp-Controlled Reefer (-18°C)",
            cargoType: "Perishable / Cold-Chain",
            weight: "42,000 lbs (19,050 kg)",
            palletCount: 24,
            dimensions: "53ft x 102in x 110in",
            commodity: "Frozen Pharmaceutical & Cold-Chain Goods",
            preferredPickupDate: "Sep 05, 2026",
            specialInstructions: "Continuous cold-chain logging required. Temperature cannot exceed -18°C.",
          },
          status: "under_review",
          priceCad: "Pending Rate Calculation",
          adminNotes: "Transimex cross-border dispatch is confirming customs bond verification and reefer unit availability.",
          submittedDate: "Sep 02, 2026",
          validUntil: "Sep 09, 2026",
        },
        {
          refNumber: "QT-2026-00122",
          client: {
            name: "Sarah Jenkins",
            companyName: "Ontario Precision Aerospace Inc.",
            email: "sjenkins@ontarioprecision.ca",
            phone: "+1 (416) 555-0144",
          },
          route: {
            origin: "Mississauga (ON)",
            originDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
            destination: "Chicago (IL)",
            destinationDetail: "4000 West 39th St, Chicago, IL 60632",
          },
          cargo: {
            transportMode: "53' Dry Van",
            equipment: "53' Tandem Dry Van (Air-Ride)",
            cargoType: "General Freight",
            weight: "34,200 lbs (15,510 kg)",
            palletCount: 20,
            dimensions: "Standard 53ft Air-Ride Van",
            commodity: "Machined Aircraft Hydraulic Valves & Titanium Actuators",
            preferredPickupDate: "Sep 06, 2026",
            specialInstructions: "High-value cargo seal required.",
          },
          status: "reviewing",
          priceCad: "Calculating Carrier Tariffs...",
          adminNotes: "Checking with Swift Transport and Bison for backhaul capacity from Chicago.",
          submittedDate: "Sep 01, 2026",
          validUntil: "Sep 08, 2026",
        },
        {
          refNumber: "QT-2026-00118",
          client: {
            name: "David Wong",
            companyName: "Pacific Gateway Distribution Corp.",
            email: "dwong@pacificgateway.ca",
            phone: "+1 (604) 555-0182",
          },
          route: {
            origin: "Toronto (ON)",
            originDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
            destination: "Vancouver (BC)",
            destinationDetail: "3388 Viking Way, Richmond, BC V6V 1N6",
          },
          cargo: {
            transportMode: "53' Dry Van",
            equipment: "53' Tandem Dry Van (Air-Ride)",
            cargoType: "General Freight",
            weight: "36,500 lbs (16,550 kg)",
            palletCount: 26,
            dimensions: "53ft x 102in",
            commodity: "Consumer Electronics & Dry Retail Freight",
            preferredPickupDate: "Aug 30, 2026",
            specialInstructions: "Overnight cross-dock transfer.",
          },
          status: "accepted",
          priceCad: "$6,200.00 CAD",
          breakdown: {
            lineHaul: "$5,100.00 CAD",
            fuelSurcharge: "$850.00 CAD",
            crossBorderFee: "$0.00 CAD (Domestic)",
            accessorials: "$250.00 CAD (Tailgate)",
            total: "$6,200.00 CAD",
          },
          shipmentId: "TMX-2026-00847",
          adminNotes: "Booking confirmed. Assigned driver Jean D. (Unit #402). Load is currently in transit.",
          submittedDate: "Aug 29, 2026",
          validUntil: "Sep 05, 2026",
        },
      ]);
    }

    // 4. Seed Initial Shipments in MongoDB
    const existingShipmentsCount = await Shipment.countDocuments();
    if (existingShipmentsCount === 0) {
      await Shipment.create([
        {
          trackingNumber: "TMX-00839",
          quoteId: "QT-2026-00115",
          client: {
            name: "Marc Tremblay",
            companyName: "Laurentian Global Logistics Ltd.",
            email: "dispatch@laurentianglobal.ca",
            phone: "+1 (514) 555-0199",
          },
          route: {
            origin: "Dorval Terminal, QC",
            originDetail: "555 Boulevard Stuart-Graham, Dorval, QC H4Y 1J6",
            destination: "Calgary Logistics Center, AB",
            destinationDetail: "11050 50 Street SE, Calgary, AB T2C 3E5",
          },
          cargo: {
            transportMode: "Intermodal Rail",
            equipment: "53' High-Cube Container",
            weight: "48,500 lbs",
            palletCount: 24,
            commodity: "Heavy Industrial Machinery Parts",
            cargoType: "Heavy Equipment",
          },
          status: "Customs Hold",
          customsStatus: "Held",
          customsBroker: "Livingston International Brokerage",
          portOfEntry: "Dorval Customs Terminal (QC)",
          cbsaPars: "PARS-8849-QC",
          cbsaNotes: "Secondary inspection flag: CBSA Officer #814 requesting verified B3 commercial invoice copy for Harmonized Tariff classification 8411.82.",
          rateCad: "$4,650.00 CAD",
          duties: {
            amountCad: "$1,850.00 CAD",
            taxGstHst: "$420.00 CAD",
            totalOwed: "$2,420.00 CAD",
            status: "Notice Dispatched",
            dispatchedAt: new Date().toISOString(),
          },
          assignedCarrier: "Canadian Pacific Rail Freight",
          eta: "Sep 04, 2026",
          timeline: [
            {
              title: "Intermodal Terminal Departure",
              location: "Dorval Intermodal Yard, QC",
              timestamp: "Sep 01, 2026, 09:00",
              statusText: "Container staged for border clearance inspection",
              completed: true,
            },
            {
              title: "CBSA Customs Examination Staged",
              location: "Dorval Customs Facility",
              timestamp: "Sep 01, 2026, 14:30",
              statusText: "PARS-8849-QC documentation flagged for review",
              completed: false,
            },
          ],
        },
        {
          trackingNumber: "TMX-00847",
          quoteId: "QT-2026-00118",
          client: {
            name: "David Wong",
            companyName: "Pacific Gateway Distribution Corp.",
            email: "dwong@pacificgateway.ca",
            phone: "+1 (604) 555-0182",
          },
          route: {
            origin: "Montreal Hub, QC",
            originDetail: "4850 Rue Saint-Patrick, Montreal, QC H4E 4N4",
            destination: "Toronto Distribution Center, ON",
            destinationDetail: "1200 Britannia Road East, Mississauga, ON L4W 4K5",
          },
          cargo: {
            transportMode: "53' Dry Van",
            equipment: "53' Tandem Dry Van (Air-Ride)",
            weight: "36,500 lbs",
            palletCount: 26,
            commodity: "Consumer Electronics & Dry Retail Freight",
            cargoType: "General Freight",
          },
          status: "In Transit",
          customsStatus: "Released",
          customsBroker: "Transimex In-House Brokerage",
          portOfEntry: "Ambassador Bridge (Windsor / Detroit)",
          cbsaPars: "PARS-9948-ON",
          cbsaNotes: "Cleared without examination. ACI eManifest transmitted and accepted by CBSA.",
          rateCad: "$6,200.00 CAD",
          assignedCarrier: "Transimex Dedicated Express Fleet",
          driverName: "Jean D. (Unit #402)",
          eta: "Today, 04:15 PM",
          timeline: [
            {
              title: "Departed Montreal Hub",
              location: "Montreal, QC",
              timestamp: "Today, 08:30 AM",
              statusText: "Unit #402 on Highway 401 Westbound",
              completed: true,
            },
          ],
        },
      ]);
    }

    const currentUsers = await User.countDocuments();
    const currentQuotes = await Quote.countDocuments();
    const currentShipments = await Shipment.countDocuments();

    return NextResponse.json({
      success: true,
      message: "Database connected and seeded with Users, Quotes, and Shipments!",
      database: {
        usersCount: currentUsers,
        quotesCount: currentQuotes,
        shipmentsCount: currentShipments,
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
