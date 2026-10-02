import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transfer to zero address", function () {
  it("should revert when transferring to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get some tokens for addr1 by calling getTokens
    // Need to send ether to trigger getTokens via receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now attempt to transfer from addr1 to zero address
    await expect(
      instance.connect(addr1).transfer(
        ethers.ZeroAddress,
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});