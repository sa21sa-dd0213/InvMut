import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - hasPlayerWagered", function () {
  it("should return false for an address that has never wagered", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await (await instance.OpenToThePublic()).wait();
    
    // Test that an address with no wager returns false
    const result = await instance.hasPlayerWagered(addr1.address);
    expect(result).to.equal(false);
  });
});