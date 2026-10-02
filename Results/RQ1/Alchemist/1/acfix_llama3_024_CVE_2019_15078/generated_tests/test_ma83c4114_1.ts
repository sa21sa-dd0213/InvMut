import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant ma83c4114 (transfer to zero address)", function () {
  it("should revert when transferring tokens to zero address in original contract, but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get tokens for addr1 by calling getTokens with some ETH
    // The getTokens function requires a payable call and the sender not blacklisted
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get addr1's balance to confirm they have tokens
    const balance = await instance.balanceOf(addr1.address);
    expect(balance).to.be.gt(0);

    // Attempt to transfer tokens from addr1 to the zero address
    // The original contract has require(_to != address(0)) which should revert
    // The mutant removed this check, so it would allow the transfer
    await expect(
      instance.connect(addr1).transfer(ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});