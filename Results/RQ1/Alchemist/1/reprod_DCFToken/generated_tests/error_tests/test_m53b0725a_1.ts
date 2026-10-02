import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m53b0725a - distributeTokenPeriodic zero address check", function () {
    it("should revert when distributeAddress is properly set and distributeTokenPeriodic is called (mutant incorrectly requires zero address)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy DCF with a liquidity receive address (any non-zero address)
        const DCF = await ethers.getContractFactory("DCF");
        const instance = await DCF.deploy(addr1.address);
        await instance.waitForDeployment();
        
        // Set the cfo (caller) to owner for setDistributeAddress
        await instance.setCaller(owner.address);
        
        // Set a valid non-zero distribute address
        const distributeAddr = addr1.address;
        await instance.setDistributeAddress(distributeAddr);
        
        // Verify distribute address is set (not zero)
        // Note: distributeAddress is not public, but we can test the behavior
        
        // Initialize the time period by calling distributeTokenPeriodic first time
        // This will set initTime = block.timestamp + 64800
        // Since the require(nowTime > initTime) will fail initially (initTime = 0),
        // the first call should succeed and set initTime
        // Wait for the first call to succeed (initTime is 0, so nowTime > 0 is true)
        await instance.distributeTokenPeriodic();
        
        // Now we need to wait for the next period (64800 seconds = 18 hours)
        // To test in a reasonable timeframe, we'll use evm_increaseTime
        await ethers.provider.send("evm_increaseTime", [64801]);
        await ethers.provider.send("evm_mine", []);
        
        // The original contract requires distributeAddress != address(0)
        // The mutant requires distributeAddress == address(0)
        // Since we set distributeAddress to a non-zero address, the mutant should revert
        // while the original would succeed (assuming sufficient balance)
        
        // Fund the contract with enough tokens for distribution
        const distributeAmount = ethers.parseEther("2000");
        await instance.transfer(await instance.getAddress(), distributeAmount);
        
        // Test: this should succeed in original but revert in mutant
        await expect(
            instance.distributeTokenPeriodic()
        ).to.be.reverted;
    });
});