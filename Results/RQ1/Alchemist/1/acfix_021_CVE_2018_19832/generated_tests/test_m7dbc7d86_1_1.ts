import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m7dbc7d86 test", function () {
  it("should revert when non-blacklisted address calls getTokens() after modifier change from == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure addr1 is not blacklisted initially
    expect(await instance.blacklist(addr1.address)).to.equal(false);

    // In the original contract, non-blacklisted address can call getTokens()
    // In the mutant, require(blacklist[msg.sender] != false) means only blacklisted addresses can pass
    // So a non-blacklisted address should revert
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});