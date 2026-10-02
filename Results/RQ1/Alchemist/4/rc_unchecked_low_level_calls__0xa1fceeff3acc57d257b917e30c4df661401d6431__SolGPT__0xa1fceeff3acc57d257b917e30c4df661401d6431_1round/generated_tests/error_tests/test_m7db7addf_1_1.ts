import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m7db7addf", function () {
  it("should revert when tos array has length 1 due to off-by-one loop bound", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a simple ERC20-like contract that will be the target of transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("10"));

    // Prepare arrays with exactly one element (length = 1)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // This call should revert on the mutant because the loop runs i <= tos.length
    // which tries to access index 1 in a 1-element array, causing out-of-bounds revert
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});