import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mb1e55086 test", function () {
  it("should detect the mutant by verifying correct value scaling with exponentiation", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Deploy a simple ERC20-like token to use as caddress
    const tokenFactory = await ethers.getContractFactory("TestToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve the airDrop contract to transfer
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    const v = 1;
    const decimals = 18; // This will cause the mutant to compute 1 * 10 * 18 = 180 instead of 1 * 10**18 = 1e18
    const recipients = [to.address];
    const expectedValue = BigInt(v) * BigInt(10) ** BigInt(decimals); // 10**18 = 1e18

    // Capture balances before
    const balanceBefore = await token.balanceOf(to.address);

    // Execute the transfer
    const tx = await instance.connect(owner).transfer(from.address, await token.getAddress(), recipients, v, decimals);
    await tx.wait();

    // Check that the recipient received the correctly scaled amount (10**decimals * v)
    const balanceAfter = await token.balanceOf(to.address);
    const actualTransfer = balanceAfter - balanceBefore;

    // In the original, actualTransfer should equal expectedValue (1e18)
    // In the mutant, actualTransfer will be v * 10 * decimals = 180, which is far less
    expect(actualTransfer).to.equal(expectedValue);
  });
});