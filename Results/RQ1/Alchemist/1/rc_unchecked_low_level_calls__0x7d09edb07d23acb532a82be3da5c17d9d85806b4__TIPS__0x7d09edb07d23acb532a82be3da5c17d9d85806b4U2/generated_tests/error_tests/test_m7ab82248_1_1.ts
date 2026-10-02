import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m7ab82248 test", function () {
  it("should return false for hasPlayerWagered with an address that never wagered", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("0.1"));
    await instance.waitForDeployment();

    // addr1 never wagered, so hasPlayerWagered should return false
    const result = await instance.hasPlayerWagered(addr1.address);
    expect(result).to.be.false;
  });
});