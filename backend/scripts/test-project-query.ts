
// const project = await prisma.project.findUnique({
//     where: {

//         projectCode: '612786'
//     },
//     include: {
//         observations: true

//     }
// })

// project?.observations


// const project = await prisma.project.findUnique({
//     where:{
//         projectCode:"612786"

//     },
//     include :{
//         select:{
//             name :true,
//             projectCode :true
//         },
//         observations: true{
//             select:{
//                 reportingMonth : true
//         }
//     }
// })
import { prisma } from "../src/lib/prisma";

function converter(x) {

    return {
        "projectCode": x.projectCode,
        "name": x.name,
        "latestProgress": x.observations[0].physicalProgressPercent,
        "latestReportingMonth": x.observations[0].reportingMonth


    }
}





async function main() {
    const project = await prisma.project.findUnique({
        where: {
            projectCode: "612786",
        },
        include: {
            observations: {
                orderBy: {
                    reportingMonth: "desc",
                },
                take: 1,
            },
        },
    });


    if (project != null || project.observations != undefined) {
        return converter(project)
    }

    return None
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());




