import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - totalRemaining calculation", function () {
  it("should detect mutant that uses addition instead of subtraction for totalRemaining", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();
    const initialTotalRemaining = await instance.totalRemaining();

    // Calculate expected totalRemaining: totalSupply - totalDistributed
    const expectedInitialRemaining = totalSupply - totalDistributed;
    
    // Assert initial totalRemaining is correct (will pass on original, fail on mutant)
    expect(initialTotalRemaining).to.equal(expectedInitialRemaining);

    // Perform a distribution to change the state
    const distributionAmount = ethers.parseEther("1000");
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get updated state after distribution
    const updatedTotalDistributed = await instance.totalDistributed();
    const updatedTotalRemaining = await instance.totalRemaining();

    // Calculate expected remaining after distribution
    const expectedUpdatedRemaining = totalSupply - updatedTotalDistributed;

    // Assert totalRemaining decreased correctly (will fail on mutant where it increases)
    expect(updatedTotalRemaining).to.equal(expectedUpdatedRemaining);
    
    // Additional check: on mutant, totalRemaining would be greater than totalSupply
    expect(updatedTotalRemaining).to.be.lte(totalSupply);
  });
});