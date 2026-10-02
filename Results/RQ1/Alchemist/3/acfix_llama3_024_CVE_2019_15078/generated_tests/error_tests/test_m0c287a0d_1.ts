import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test for onlyWhitelist modifier", function () {
  it("should revert when non-blacklisted user calls getTokens due to mutant != check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure addr1 is NOT blacklisted (default state)
    expect(await instance.blacklist(addr1.address)).to.equal(false);

    // In the original contract, a non-blacklisted user can call getTokens.
    // In the mutant, the require(blacklist[msg.sender] != false) will cause a revert
    // because blacklist[addr1] == false, so the condition false != false is false.
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});