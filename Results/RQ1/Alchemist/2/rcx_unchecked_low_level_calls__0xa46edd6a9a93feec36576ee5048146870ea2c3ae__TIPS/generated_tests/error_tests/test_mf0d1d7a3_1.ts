import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mf0d1d7a3 by reverting on out-of-bounds array access", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract to use as caddress
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to 'from' and approve the EBU contract to spend them
    await token.mint(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    const recipients = [recipient.address];
    const values = [ethers.parseEther("10")];

    // The original contract would succeed, but the mutant (i <= _tos.length)
    // will try to access _tos[1] which is out of bounds, causing revert
    await expect(
      instance.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        values
      )
    ).to.be.reverted;
  });
});