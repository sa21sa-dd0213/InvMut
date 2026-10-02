import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should kill mutant mb1449ed7 by reverting due to out-of-bounds array access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that the airPort can call
    const tokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve airPort to transfer
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Create array with one recipient - the mutant will loop to index 1 (length=1) causing out-of-bounds
    const recipients = [addr2.address];
    const value = ethers.parseEther("1");

    // The original contract would succeed; the mutant reverts due to i<=_tos.length
    await expect(
      instance.transfer(addr1.address, token.target, recipients, value)
    ).to.be.reverted;
  });
});