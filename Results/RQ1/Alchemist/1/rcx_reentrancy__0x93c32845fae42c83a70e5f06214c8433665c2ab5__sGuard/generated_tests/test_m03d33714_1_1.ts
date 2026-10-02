import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m03d33714 detection", function () {
    it("should detect the mutant by reverting when balance > withdrawal amount", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for X_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy X_WALLET with Log address
        const Factory = await ethers.getContractFactory("X_WALLET");
        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();
        
        // User deposits exactly 1 ether (meets MinSum)
        const depositAmount = ethers.parseEther("1.0");
        const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        await instance.connect(user).Put(unlockTime, { value: depositAmount });
        
        // User tries to withdraw 0.5 ether (less than balance)
        const withdrawAmount = ethers.parseEther("0.5");
        
        // In original: acc.balance >= _am (1 >= 0.5 = true) → should succeed
        // In mutant: acc.balance <= _am (1 <= 0.5 = false) → should revert
        // So we expect revert if mutant is deployed
        await expect(
            instance.connect(user).Collect(withdrawAmount)
        ).to.be.reverted;
    });
});