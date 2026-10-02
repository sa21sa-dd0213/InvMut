import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m654f3dec - kill with successful transfer call", function () {
  it("should revert on mutant but pass on original when token transfer succeeds", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' and approve EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Prepare transfer parameters
    const tos = [to.address];
    const values = [ethers.parseEther("10")];

    // Call transfer on the original - should succeed
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      tos,
      values
    );

    // On the original contract, this succeeds
    // On the mutant (if (true)), it will always revert
    // We expect the transaction to revert on the mutant
    await expect(tx).to.not.be.reverted;

    // Verify the transfer actually happened
    const fromBalance = await token.balanceOf(from.address);
    const toBalance = await token.balanceOf(to.address);
    expect(fromBalance).to.equal(ethers.parseEther("90"));
    expect(toBalance).to.equal(ethers.parseEther("10"));
  });
});