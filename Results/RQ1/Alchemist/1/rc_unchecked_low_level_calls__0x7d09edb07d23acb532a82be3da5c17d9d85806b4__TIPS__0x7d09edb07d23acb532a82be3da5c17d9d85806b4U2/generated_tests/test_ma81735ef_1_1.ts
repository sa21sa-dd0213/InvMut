import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - hasPlayerWagered", function () {
  it("should return false for an address that has never wagered", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr2.address, betLimit);
    await instance.waitForDeployment();

    // addr1 has never wagered, so hasPlayerWagered should return false
    const result = await instance.hasPlayerWagered(addr1.address);
    expect(result).to.equal(false);
  });
});