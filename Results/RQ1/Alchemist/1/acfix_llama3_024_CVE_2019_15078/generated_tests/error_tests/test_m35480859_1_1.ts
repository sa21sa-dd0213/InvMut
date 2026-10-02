import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m35480859 - getTokens blacklist test", function () {
  it("should blacklist the caller after first getTokens call and revert on second call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished and the caller is not blacklisted initially
    expect(await instance.distributionFinished()).to.equal(false);
    expect(await instance.blacklist(addr1.address)).to.equal(false);

    // Send ETH to trigger getTokens() via receive()
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // After first call, addr1 should be blacklisted in the original contract
    // (mutant never blacklists because toGive < 0 is always false for uint256)
    // Now try calling getTokens again from addr1 - should revert due to onlyWhitelist modifier
    await expect(
      instance.connect(addr1).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});