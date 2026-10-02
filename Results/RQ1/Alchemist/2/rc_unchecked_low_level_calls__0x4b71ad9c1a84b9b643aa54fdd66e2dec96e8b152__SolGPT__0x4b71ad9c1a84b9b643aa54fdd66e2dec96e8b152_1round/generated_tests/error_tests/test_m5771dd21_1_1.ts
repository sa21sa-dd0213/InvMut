import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - keccak256 vs sha256", function () {
  it("should detect mutant by verifying token transfer fails due to wrong function selector", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund the 'from' address with tokens
    await token.transfer(from.address, ethers.parseEther("100"));

    // Approve the 'from' to allow the airPort contract to transfer on its behalf
    // Note: The airPort contract address is not known yet, so we deploy it first
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Now approve the airPort contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(airPort.target, ethers.parseEther("100"));

    // Now transfer from should work with original, but with mutant sha256 it will fail
    const tos = [to1.address, to2.address];
    const value = ethers.parseEther("10");

    // This call should revert on mutant because sha256 produces wrong selector
    await expect(
      airPort.transfer(from.address, token.target, tos, value)
    ).to.be.reverted;

    // Verify no tokens were transferred (should hold true for both original and mutant)
    // Original would succeed and transfer tokens, mutant would revert
    // We check revert to confirm mutant behavior
  });
});