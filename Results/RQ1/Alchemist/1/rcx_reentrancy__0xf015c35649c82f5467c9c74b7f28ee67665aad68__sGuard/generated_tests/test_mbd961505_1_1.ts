import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mbd961505 test", function () {
    it("should prevent collecting funds before unlock time", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required by MY_BANK constructor)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy MY_BANK with Log address
        const BankFactory = await ethers.getContractFactory("MY_BANK");
        const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
        await bankInstance.waitForDeployment();
        
        // Get current block timestamp
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const currentTime = blockBefore!.timestamp;
        
        // Set unlock time 1 hour in the future
        const futureUnlock = currentTime + 3600;
        
        // Deposit 2 ether with future unlock time
        const depositAmount = ethers.parseEther("2");
        await bankInstance.connect(addr1).Put(futureUnlock, { value: depositAmount });
        
        // Try to collect 1 ether immediately (should revert because unlock time not reached)
        const collectAmount = ethers.parseEther("1");
        await expect(
            bankInstance.connect(addr1).Collect(collectAmount)
        ).to.be.reverted;
    });
});