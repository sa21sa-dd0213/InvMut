import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
    it("should kill mutant m476ef69f by testing Put with future unlock time and immediate Collect revert", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();
        
        const depositAmount = ethers.parseEther("2");
        const futureUnlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
        
        // Call Put with a future unlock time
        await instance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });
        
        // Immediately try to Collect the full amount - should revert because unlock time not reached
        await expect(
            instance.connect(addr1).Collect(depositAmount)
        ).to.be.reverted;
    });
});