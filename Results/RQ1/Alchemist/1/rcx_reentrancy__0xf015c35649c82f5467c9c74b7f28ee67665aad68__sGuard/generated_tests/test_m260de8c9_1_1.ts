import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m260de8c9", function () {
    it("should revert when attempting to collect more than balance (mutant incorrectly allows it)", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for MY_BANK)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy MY_BANK with Log contract address
        const BankFactory = await ethers.getContractFactory("MY_BANK");
        const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
        await bankInstance.waitForDeployment();
        
        // User deposits 5 ether (calls Put with unlockTime in the future)
        const depositAmount = ethers.parseEther("5");
        const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        await bankInstance.connect(user).Put(unlockTime, { value: depositAmount });
        
        // Attempt to collect 10 ether (more than balance)
        const collectAmount = ethers.parseEther("10");
        
        // The original contract would revert because 5 < 10, but the mutant allows it (5 <= 10)
        // We expect the transaction to revert in the original, which kills the mutant
        await expect(
            bankInstance.connect(user).Collect(collectAmount)
        ).to.be.reverted;
    });
});