import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mc08afc12", function () {
  it("should kill mutant by verifying currentDifficulty returns the set difficulty value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("0.1");
    const whaleAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Set a non-zero difficulty value
    const testDifficulty = 42;
    await instance.connect(owner).AdjustDifficulty(testDifficulty);
    
    // Call currentDifficulty and verify it returns the expected value
    const returnedDifficulty = await instance.currentDifficulty();
    
    // If the mutant removed the return statement, it will return 0 instead of testDifficulty
    expect(returnedDifficulty).to.equal(testDifficulty);
  });
});