import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mec62b79e", function () {
    it("should revert Collect when Put is called with _unlockTime=0 because mutant uses block.prevrandao instead of block.timestamp", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy the Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();
        
        const depositAmount = ethers.parseEther("2");
        const minSum = await instance.MinSum();
        
        // User calls Put with _unlockTime = 0
        // In original: unlockTime becomes block.timestamp (current time)
        // In mutant: comparison uses block.prevrandao (random), may set unlockTime to a large value
        await instance.connect(user).Put(0, { value: depositAmount });
        
        // Now user tries to Collect the same amount immediately
        // Should succeed in original because unlockTime == block.timestamp (already passed)
        // Should revert in mutant if block.prevrandao caused unlockTime to be set much larger
        const userBalance = await instance.Acc(user.address);
        const unlockTime = userBalance.unlockTime;
        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        
        if (unlockTime > currentTime) {
            // Mutant detected - unlockTime is in the future, Collect should revert
            await expect(
                instance.connect(user).Collect(depositAmount, { value: 0 })
            ).to.be.reverted;
        } else {
            // Original behavior - Collect should succeed
            await instance.connect(user).Collect(depositAmount, { value: 0 });
            const finalBalance = await instance.Acc(user.address);
            expect(finalBalance.balance).to.equal(0);
        }
    });
});