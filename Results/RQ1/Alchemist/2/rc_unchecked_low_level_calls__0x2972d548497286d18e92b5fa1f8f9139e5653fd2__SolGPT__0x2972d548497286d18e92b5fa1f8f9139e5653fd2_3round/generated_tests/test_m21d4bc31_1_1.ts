import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m21d4bc31 test", function () {
  it("should revert when external transferFrom call fails due to insufficient allowance", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give from address some tokens
    await token.transfer(from.address, ethers.parseEther("100"));

    // No approval given to the demo contract, so transferFrom will fail
    const tos = [to.address];
    const values = [ethers.parseEther("10")];

    // The original contract would revert; the mutant would not revert and return true
    await expect(
      instance.connect(owner).transfer(from.address, await token.getAddress(), tos, values)
    ).to.be.reverted;
  });
});