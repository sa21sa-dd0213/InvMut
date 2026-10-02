import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - Kill mutant md9cf97de", function () {
    it("should revert when calling getFreeKilo twice from same address", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EtherCartel");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Seed the market to initialize the contract
        await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("1") });
        
        // First call to getFreeKilo should succeed
        await instance.connect(user).getFreeKilo();
        
        // Second call to getFreeKilo from the same address should revert
        // because Kilos[user] is no longer 0
        await expect(
            instance.connect(user).getFreeKilo()
        ).to.be.reverted;
    });
});