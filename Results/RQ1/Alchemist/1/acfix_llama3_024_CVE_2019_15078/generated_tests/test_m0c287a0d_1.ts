import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m0c287a0d - onlyWhitelist modifier", function () {
  it("should revert when a non-blacklisted address calls getTokens on the mutant (where require(blacklist[msg.sender] != false) blocks non-blacklisted callers)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure addr1 is not blacklisted (default is false)
    const isBlacklisted = await instance.blacklist(addr1.address);
    expect(isBlacklisted).to.equal(false);

    // On the original contract, this call would succeed because addr1 is NOT blacklisted.
    // On the mutant (require(blacklist[msg.sender] != false)), it will revert because
    // blacklist[addr1] is false, and false != false is false, failing the require.
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});