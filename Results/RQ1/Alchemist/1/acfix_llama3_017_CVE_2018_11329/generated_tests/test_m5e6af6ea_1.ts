import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m5e6af6ea - kill sellDrugs initialization check", function () {
    it("should revert when calling sellDrugs before initialization on original, but mutant allows it", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherCartel");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Get free kilo first so addr1 has some kilos to produce drugs
        await instance.connect(addr1).getFreeKilo();

        // Advance time to accumulate some drugs
        await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
        await ethers.provider.send("evm_mine", []);

        // Try to sell drugs before initialization - should revert on original, succeed on mutant
        await expect(
            instance.connect(addr1).sellDrugs()
        ).to.be.reverted;
    });
});