import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m0fbd495b", function () {
  it("should revert when vs array has exactly one element (length > 0 is required, mutant uses < 0 which always fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that supports transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve contract to spend them
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare arrays with exactly one element (vs.length = 1)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // On original: should succeed (vs.length > 0 is true)
    // On mutant: require(vs.length < 0) will always revert since vs.length = 1 is never < 0
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});