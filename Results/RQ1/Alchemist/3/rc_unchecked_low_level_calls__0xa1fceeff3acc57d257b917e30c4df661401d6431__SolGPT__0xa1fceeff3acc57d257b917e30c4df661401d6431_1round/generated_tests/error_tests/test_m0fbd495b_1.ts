import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert on mutant when vs array is non-empty (mutant has require(vs.length < 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    const tos = [await addr1.getAddress()];
    const vs = [ethers.parseEther("1")];  // non-empty array

    // This call should revert because require(vs.length < 0) is always false
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});