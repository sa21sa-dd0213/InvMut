import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - currentBetLimit", function () {
    it("should detect mutant that removes return statement from currentBetLimit", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy with required constructor arguments
        const Factory = await ethers.getContractFactory("PoCGame");
        const instance = await Factory.deploy(addr1.address, ethers.parseEther("1.0"));
        await instance.waitForDeployment();
        
        // Set a specific bet limit via AdjustBetAmounts (onlyOwner)
        const newBetLimit = ethers.parseEther("5.0");
        await instance.connect(owner).AdjustBetAmounts(newBetLimit);
        
        // Call currentBetLimit and verify it returns the set value
        // The mutant removes the return statement, so it would return 0 instead
        const returnedBetLimit = await instance.currentBetLimit();
        
        // Assert that the returned value matches the set bet limit
        // This will fail on the mutant because it returns nothing (default 0)
        expect(returnedBetLimit).to.equal(newBetLimit);
    });
});