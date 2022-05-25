import { ContractModel } from './models/contract'
import { connect } from 'mongoose'

import { ContractData } from 'interfaces'
import { ABI_Row } from 'interfaces/abi'

import { DatabaseInterface } from 'utils/DatabaseInterface'
import { ABI_RowModel } from 'utils/mongoose/models/abi'

export class MongooseDatabaseInterface extends DatabaseInterface {
    connectionString: string

    constructor(connectionString: string) {
        super()
        this.connectionString = connectionString
    }
    async connect() {
        // TODO
        // mongoose.connect('mongodb://user:pass@localhost:port/database', { autoIndex: false }); for PROD
        await connect(this.connectionString)
    }

    async getContractDataForManyContracts(contractAddresses: string[]): Promise<Record<string, ContractData | null>> {
        const contractMap: Record<string, ContractData | null> = {}
        for (let i = 0; i < contractAddresses.length; i++) {
            contractMap[contractAddresses[i]] = null
        }

        try {
            const modelData = await ContractModel.find({ address: { $in: contractAddresses } })
            const data = modelData.map((model) => model.toObject())

            for (let i = 0; i < contractAddresses.length; i++) {
                const contractAddress = contractAddresses[i]
                const contractData = data.find((contract) => contract.address === contractAddress)
                contractMap[contractAddress] = contractData || null
            }
        } catch (e) {
            console.log('get contract mongoose error')
            console.log(e)
            // return null
        }
        // return here instead of in the try, so that it still works if the db is down
        return contractMap
    }

    async addOrUpdateManyContractData(contractDataArr: ContractData[]): Promise<void> {
        try {
            // only way to do bulk upsert
            const { result } = await ContractModel.bulkWrite(
                contractDataArr.map((contract) => ({
                    updateOne: {
                        filter: { address: contract.address },
                        update: contract,
                        upsert: true,
                    },
                })),
            )

            console.log('contracts:')
            console.log(result)
        } catch (e) {
            console.log('contract mongoose error')
            console.log(e)
        }
    }

    async addOrUpdateManyABI(abiArr: ABI_Row[]): Promise<void> {
        // prob don'`t need these 3 lines but might it optimize the writes
        const uniqueABIsAsStrings = new Set<string>()
        abiArr.map((abi) => uniqueABIsAsStrings.add(JSON.stringify(abi)))
        const uniqueABIs = Array.from(uniqueABIsAsStrings).map((str) => JSON.parse(str))

        try {
            // only way to do bulk upsert
            const { result } = await ABI_RowModel.bulkWrite(
                uniqueABIs.map((abi) => ({
                    updateOne: {
                        filter: { hashedSignature: abi.hashedSignature, fullSignature: abi.fullSignature },
                        update: abi,
                        upsert: true,
                    },
                })),
            )

            console.log('ABIs:')
            console.log(result)
        } catch (e) {
            console.log('abi mongoose error')
            console.log(e)
        }
    }

    async getABIsForHexSignature(hexSignature: string): Promise<ABI_Row[] | null> {
        return Promise.resolve(null)
    }
}
