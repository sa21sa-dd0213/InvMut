import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - mdf965874", function () {
    it("should detect block.timestamp replacement with block.prevrandao in sellDrugs", async function () {
        const [owner, user] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherCartel");
        const contract = await Factory.deploy();
        await contract.waitForDeployment();

        // Seed the market to initialize the contract
        const seedDrugs = ethers.parseEther("100");
        await contract.seedMarket(seedDrugs, { value: ethers.parseEther("10") });

        // User gets free kilos to start producing drugs
        await contract.connect(user).getFreeKilo();

        // Wait some time to accumulate drugs
        const waitTime = 100; // seconds
        await ethers.provider.send("evm_increaseTime", [waitTime]);
        await ethers.provider.send("evm_mine");

        // Get drugs before sell
        const drugsBefore = await contract.connect(user).getMyDrugs();

        // Perform sellDrugs - in mutant this will set lastCollect to block.prevrandao instead of block.timestamp
        await contract.connect(user).sellDrugs();

        // Wait again to see if drug accumulation is affected
        await ethers.provider.send("evm_increaseTime", [waitTime]);
        await ethers.provider.send("evm_mine");

        // Get drugs after second wait period
        const drugsAfter = await contract.connect(user).getMyDrugs();

        // In the original, drugsAfter should be > 0 because time passed and user has kilos
        // In the mutant, block.prevrandao is used which is unpredictable and may cause
        // getDrugsSinceLastCollect to compute incorrectly (possibly 0 or overflow)
        // We expect drugsAfter to be greater than 0 for the original to pass
        // The mutant will likely fail this assertion
        expect(drugsAfter).to.be.gt(0);
    });
});