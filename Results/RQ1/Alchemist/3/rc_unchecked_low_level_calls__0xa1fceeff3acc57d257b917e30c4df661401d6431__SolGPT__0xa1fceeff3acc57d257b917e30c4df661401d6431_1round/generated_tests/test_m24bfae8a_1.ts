import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m24bfae8a", function () {
  it("should succeed when arrays have equal length on original, but fail on mutant with != instead of ==", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a simple ERC20 token that implements transferFrom for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Approve the AirDropContract to spend tokens from owner
    await token.approve(instanceAddress, ethers.parseEther("100"));

    // Prepare arrays with equal length (1 element each)
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // Call transfer with equal-length arrays - should succeed on original, revert on mutant
    await expect(
      instance.transfer(tokenAddress, tos, vs)
    ).to.not.be.reverted;
  });
});