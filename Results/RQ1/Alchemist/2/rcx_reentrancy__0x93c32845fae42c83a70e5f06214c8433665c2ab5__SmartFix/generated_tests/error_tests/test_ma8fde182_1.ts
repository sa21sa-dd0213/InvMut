import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - ma8fde182", function () {
    it("should kill mutant by testing Collect with balance >= MinSum but insufficient funds and early withdrawal", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for X_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy X_WALLET with Log address
        const WalletFactory = await ethers.getContractFactory("X_WALLET");
        const wallet = await WalletFactory.deploy(await log.getAddress());
        await wallet.waitForDeployment();
        
        // User deposits exactly MinSum (1 ether) to satisfy first condition
        const depositAmount = ethers.parseEther("1.0");
        await wallet.connect(user).Put(0, { value: depositAmount });
        
        // Attempt to withdraw more than balance (e.g., 2 ether) before unlock time
        const withdrawAmount = ethers.parseEther("2.0");
        
        // In original contract: should revert because:
        // - acc.balance (1 eth) >= _am (2 eth) is FALSE
        // - block.timestamp > acc.unlockTime is FALSE (unlockTime = 0 from Put(0))
        // In mutant: succeeds because acc.balance >= MinSum (1 >= 1) is TRUE due to || operator
        await expect(
            wallet.connect(user).Collect(withdrawAmount)
        ).to.be.reverted;
    });
});