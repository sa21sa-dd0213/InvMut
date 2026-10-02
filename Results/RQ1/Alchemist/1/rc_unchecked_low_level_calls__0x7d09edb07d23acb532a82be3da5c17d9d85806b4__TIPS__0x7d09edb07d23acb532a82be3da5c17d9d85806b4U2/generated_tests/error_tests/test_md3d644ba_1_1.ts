import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - hasPlayerWagered", function () {
  it("should return false for an address that has never wagered", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = addr1.address;

    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();

    // Test that an address with no wager returns false
    const result = await instance.hasPlayerWagered(owner.address);
    expect(result).to.equal(false);
  });
});