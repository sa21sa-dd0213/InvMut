import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - sha256 vs keccak256", function () {
  it("should kill mutant m69886c07 by verifying transferFrom selector correctness", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract that tracks transferFrom calls
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the EBU contract (no constructor arguments needed)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();

    // Mint tokens to 'from' address
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);

    // Approve EBU to spend tokens from 'from' address
    await token.connect(from).approve(ebu.target, mintAmount);

    // Prepare transfer parameters
    const tos = [to.address];
    const values = [ethers.parseEther("10")];

    // Call EBU.transfer - original uses keccak256, mutant uses sha256
    const tx = await ebu.connect(owner).transfer(from.address, token.target, tos, values);
    await tx.wait();

    // Check if the transfer actually happened
    const fromBalance = await token.balanceOf(from.address);
    const toBalance = await token.balanceOf(to.address);

    // In the original, tokens should be transferred
    // In the mutant, sha256 produces wrong selector, so no transfer occurs
    expect(toBalance).to.equal(ethers.parseEther("10"));
    expect(fromBalance).to.equal(ethers.parseEther("90"));
  });
});