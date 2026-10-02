import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - currentDifficulty return removal", function () {
    it("should detect mutant that removes return statement from currentDifficulty", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const whaleAddress = addr1.address;
        const wagerLimit = ethers.parseEther("1");
        
        const Factory = await ethers.getContractFactory("PoCGame");
        const instance = await Factory.deploy(whaleAddress, wagerLimit);
        await instance.waitForDeployment();
        
        // Set a non-zero difficulty value
        const testDifficulty = 100;
        await instance.AdjustDifficulty(testDifficulty);
        
        // Call currentDifficulty and verify it returns the set value
        const returnedDifficulty = await instance.currentDifficulty();
        expect(returnedDifficulty).to.equal(testDifficulty);
    });
});