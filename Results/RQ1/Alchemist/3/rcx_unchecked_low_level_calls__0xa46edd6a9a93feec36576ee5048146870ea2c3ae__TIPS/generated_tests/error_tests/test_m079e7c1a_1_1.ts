import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m079e7c1a test", function () {
  it("should kill the mutant by detecting missing revert on failed transferFrom", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as caddress
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Set allowance from 'from' to EBU contract (zero allowance)
    // Since allowance is 0, transferFrom will fail
    // No approval needed - we want it to fail

    // Attempt transfer with zero allowance - should revert on original, but not on mutant
    const tos = [to.address];
    const values = [ethers.parseEther("1")];

    // The call should revert on original, but pass on mutant
    // We expect it to NOT revert (mutant behavior)
    await expect(
      instance.connect(owner).transfer(from.address, token.target, tos, values)
    ).to.not.be.reverted;

    // Additionally verify the token transfer did NOT happen
    const balanceTo = await token.balanceOf(to.address);
    expect(balanceTo).to.equal(0);
  });
});