import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test for currentBetLimit", function () {
  it("should detect mutant that removes return statement from currentBetLimit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // First verify initial bet limit matches constructor argument
    const initialBetLimit = await instance.currentBetLimit();
    expect(initialBetLimit).to.equal(wagerLimit);

    // Change the bet limit to a different value
    const newBetLimit = ethers.parseEther("2.0");
    await instance.connect(owner).AdjustBetAmounts(newBetLimit);

    // Verify the bet limit was updated - the mutant will return 0 instead
    const updatedBetLimit = await instance.currentBetLimit();
    expect(updatedBetLimit).to.equal(newBetLimit);
  });
});