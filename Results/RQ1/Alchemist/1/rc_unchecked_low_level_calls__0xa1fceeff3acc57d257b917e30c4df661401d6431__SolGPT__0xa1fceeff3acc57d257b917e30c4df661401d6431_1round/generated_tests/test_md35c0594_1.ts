import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant md35c0594", function () {
  it("should revert when tos and vs arrays have different lengths", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Setup: approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare mismatched arrays: 2 recipients but 1 value
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("100")];

    // The original contract requires tos.length == vs.length, so this should revert
    await expect(
      instance.transfer(tokenAddress, tos, vs)
    ).to.be.reverted;
  });
});