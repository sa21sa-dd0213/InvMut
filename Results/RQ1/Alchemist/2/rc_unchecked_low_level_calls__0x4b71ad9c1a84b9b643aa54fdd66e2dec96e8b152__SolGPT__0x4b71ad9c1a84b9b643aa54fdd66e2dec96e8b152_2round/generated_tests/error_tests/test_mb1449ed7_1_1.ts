import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - mb1449ed7", function () {
  it("should revert when _tos array has one element due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock token contract to use as the caddress parameter
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy();
    await token.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with tokens so transferFrom can work
    await token.mint(addr1.address, ethers.parseEther("100"));

    // Approve the airPort contract to spend tokens on behalf of addr1
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Create a _tos array with exactly ONE address
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // This should revert on the mutant (loop runs i=0 and i=1, index 1 out of bounds)
    // but succeed on the original (loop runs only i=0)
    await expect(
      instance.transfer(addr1.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});